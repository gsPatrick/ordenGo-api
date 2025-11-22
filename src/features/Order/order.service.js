const { 
  Order, OrderItem, TableSession, Table, Product, ProductVariant, User, sequelize 
} = require('../../models');
const AppError = require('../../utils/AppError');

// ============================================================
// SESSÃO DA MESA
// ============================================================

/**
 * Abre uma nova sessão (Mesa Ocupada)
 * Define o nome do cliente automaticamente como "Mesa X"
 */
exports.startSession = async (restaurantId, tableId) => {
  const table = await Table.findOne({ where: { id: tableId, restaurantId } });
  
  if (!table) throw new AppError('Mesa não encontrada', 404);

  // Se já tem sessão aberta, retorna ela (evita duplicação)
  if (table.status !== 'free' && table.currentSessionId) {
    return await TableSession.findByPk(table.currentSessionId);
  }

  const transaction = await sequelize.transaction();
  try {
    // Cria a sessão
    const session = await TableSession.create({
      restaurantId,
      tableId,
      // MUDANÇA: Fixado como o nome/número da mesa (ex: "Mesa 10")
      clientName: `Mesa ${table.number}`, 
      status: 'open',
      openedAt: new Date()
    }, { transaction });

    // Atualiza a mesa para Ocupada + Incrementa contador de sessões (Telemetria)
    table.status = 'occupied';
    table.currentSessionId = session.id;
    table.lifetimeSessionCount = (table.lifetimeSessionCount || 0) + 1;
    
    await table.save({ transaction });

    await transaction.commit();
    return session;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Fecha a sessão (Conta paga) e calcula tempo de uso
 */
exports.closeSession = async (restaurantId, sessionId, paymentMethod) => {
  const session = await TableSession.findOne({ where: { id: sessionId, restaurantId } });
  if (!session) throw new AppError('Sessão não encontrada', 404);
  
  const table = await Table.findByPk(session.tableId);

  const transaction = await sequelize.transaction();
  try {
    // Fecha a sessão
    session.status = 'closed';
    session.closedAt = new Date();
    session.paymentMethod = paymentMethod;
    await session.save({ transaction });

    // Libera a mesa e calcula tempo de ocupação (Telemetria)
    if (table) {
      table.status = 'free';
      table.currentSessionId = null;
      
      // Cálculo de tempo decorrido em segundos
      const startTime = new Date(session.openedAt).getTime();
      const endTime = new Date(session.closedAt).getTime();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      // Soma ao acumulador vitalício da mesa
      table.lifetimeOccupiedSeconds = (Number(table.lifetimeOccupiedSeconds) || 0) + durationSeconds;

      await table.save({ transaction });
    }

    await transaction.commit();
    return session;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ============================================================
// PEDIDOS
// ============================================================

/**
 * Cria um pedido novo (Envia para cozinha)
 * Calcula preços no backend para segurança
 */
exports.createOrder = async (restaurantId, data) => {
  const { tableSessionId, waiterId, items, notes } = data; // items = [{ productId, quantity, modifiers... }]

  const session = await TableSession.findByPk(tableSessionId);
  if (!session || session.status === 'closed') {
    throw new AppError('Sessão inválida ou já fechada.', 400);
  }

  const transaction = await sequelize.transaction();
  try {
    // 1. Calcular totais validando preços no Banco de Dados
    let orderTotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) throw new AppError(`Produto ID ${item.productId} não encontrado`, 400);

      let unitPrice = Number(product.price);

      // Se tiver variante (Tamanho), pega o preço dela
      if (item.productVariantId) {
        const variant = await ProductVariant.findByPk(item.productVariantId);
        if (variant) unitPrice = Number(variant.price);
      }

      // Somar Modificadores
      let modifiersTotal = 0;
      if (item.modifiers && Array.isArray(item.modifiers)) {
        modifiersTotal = item.modifiers.reduce((acc, mod) => acc + Number(mod.price || 0), 0);
      }

      const finalUnitPrice = unitPrice + modifiersTotal;
      const itemTotal = finalUnitPrice * item.quantity;
      
      orderTotal += itemTotal;

      orderItemsData.push({
        productId: item.productId,
        productVariantId: item.productVariantId || null,
        quantity: item.quantity,
        unitPrice: finalUnitPrice,
        totalPrice: itemTotal,
        modifiers: item.modifiers, // Salva snapshot JSON
        observation: item.observation
      });
    }

    // 2. Criar o Order
    const order = await Order.create({
      restaurantId,
      tableSessionId,
      waiterId: waiterId || null,
      status: 'pending', // Cozinha recebe como Pendente
      total: orderTotal,
      notes
    }, { transaction });

    // 3. Criar os Itens
    const itemsWithOrderId = orderItemsData.map(i => ({ ...i, orderId: order.id }));
    await OrderItem.bulkCreate(itemsWithOrderId, { transaction });

    // 4. Atualizar o Total da Sessão
    session.totalAmount = Number(session.totalAmount) + orderTotal;
    await session.save({ transaction });

    await transaction.commit();

    // Retornar pedido completo (com itens e detalhes)
    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, attributes: ['name'] }] },
        { model: TableSession, attributes: ['tableId', 'clientName'] }
      ]
    });

    return fullOrder;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Atualiza status (Aceitar, Pronto, Entregue)
 */
exports.updateOrderStatus = async (restaurantId, orderId, status) => {
  const order = await Order.findOne({ 
    where: { id: orderId, restaurantId },
    include: [{ model: TableSession }] // Necessário para saber a Mesa ID para o socket
  });
  
  if (!order) throw new AppError('Pedido não encontrado', 404);

  order.status = status;
  await order.save();

  return order;
};

/**
 * Lista pedidos de uma sessão (Histórico da mesa)
 */
exports.getSessionOrders = async (sessionId) => {
  return await Order.findAll({
    where: { tableSessionId: sessionId },
    include: [{ model: OrderItem, as: 'items', include: [Product] }],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Lista pedidos ativos do Restaurante (Para o Painel do Garçom/Cozinha)
 */
exports.getActiveOrders = async (restaurantId) => {
  return await Order.findAll({
    where: { 
      restaurantId,
      status: ['pending', 'accepted', 'preparing', 'ready'] // Não traz entregues/cancelados
    },
    include: [
      { 
        model: TableSession, 
        include: [{ model: Table }] // Para mostrar "Mesa 01"
      },
      { model: OrderItem, as: 'items', include: [Product] }
    ],
    order: [['createdAt', 'ASC']] // FIFO (First In, First Out)
  });
};