const { 
  Order, OrderItem, TableSession, Table, Product, ProductVariant, User, sequelize 
} = require('../../models');
const AppError = require('../../utils/AppError');

// ============================================================
// SESSÃO DA MESA
// ============================================================

/**
 * Abre uma nova sessão (Mesa Ocupada)
 * CORREÇÃO: Aceita tableId numérico (1) ou UUID, e salva o UUID correto na sessão.
 */
exports.startSession = async (restaurantId, tableIdInput) => {
  // 1. Tenta encontrar a mesa (aceita tanto ID 1 quanto UUID)
  let table;
  
  // Verifica se é um número inteiro (ID sequencial) ou string numérica
  // UUIDs contêm hífens e letras, IDs numéricos não.
  if (!isNaN(tableIdInput) && !String(tableIdInput).includes('-')) {
    table = await Table.findOne({ where: { id: tableIdInput, restaurantId } });
  } else {
    // Se for string complexa (UUID), busca pelo UUID
    table = await Table.findOne({ 
      where: { 
        restaurantId,
        uuid: tableIdInput
      } 
    });
  }
  
  if (!table) throw new AppError('Mesa não encontrada', 404);

  // Se já tem sessão aberta, retorna ela para evitar duplicação
  if (table.status !== 'free' && table.currentSessionId) {
    return await TableSession.findByPk(table.currentSessionId);
  }

  const transaction = await sequelize.transaction();
  try {
    // Cria a sessão
    const session = await TableSession.create({
      restaurantId,
      // CRÍTICO: Salvamos o UUID da mesa na sessão (pois a coluna é type: UUID), 
      // mesmo que a entrada tenha sido o ID numérico 1.
      tableId: table.uuid, 
      clientName: `Mesa ${table.number}`, 
      status: 'open',
      openedAt: new Date()
    }, { transaction });

    // Atualiza a mesa
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
 * Fecha a sessão (Conta paga)
 */
exports.closeSession = async (restaurantId, sessionId, paymentMethod) => {
  const session = await TableSession.findOne({ where: { id: sessionId, restaurantId } });
  if (!session) throw new AppError('Sessão não encontrada', 404);
  
  // Busca a mesa usando o UUID salvo na sessão
  const table = await Table.findOne({ where: { uuid: session.tableId } });

  const transaction = await sequelize.transaction();
  try {
    session.status = 'closed';
    session.closedAt = new Date();
    session.paymentMethod = paymentMethod;
    await session.save({ transaction });

    if (table) {
      table.status = 'free';
      table.currentSessionId = null;
      
      // Cálculo de tempo decorrido em segundos (Telemetria)
      const startTime = new Date(session.openedAt).getTime();
      const endTime = new Date(session.closedAt).getTime();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

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

exports.createOrder = async (restaurantId, data) => {
  const { tableSessionId, waiterId, items, notes } = data;

  const session = await TableSession.findByPk(tableSessionId);
  if (!session || session.status === 'closed') {
    throw new AppError('Sessão inválida ou já fechada.', 400);
  }

  const transaction = await sequelize.transaction();
  try {
    let orderTotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) throw new AppError(`Produto ID ${item.productId} não encontrado`, 400);

      let unitPrice = Number(product.price);

      // Se tiver variante (Tamanho), usa o preço da variante
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
        modifiers: item.modifiers, // Snapshot JSON
        observation: item.observation
      });
    }

    const order = await Order.create({
      restaurantId,
      tableSessionId,
      waiterId: waiterId || null,
      status: 'pending',
      total: orderTotal,
      notes
    }, { transaction });

    const itemsWithOrderId = orderItemsData.map(i => ({ ...i, orderId: order.id }));
    await OrderItem.bulkCreate(itemsWithOrderId, { transaction });

    // Atualiza total da sessão
    session.totalAmount = Number(session.totalAmount) + orderTotal;
    await session.save({ transaction });

    await transaction.commit();

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

exports.updateOrderStatus = async (restaurantId, orderId, status) => {
  const order = await Order.findOne({ 
    where: { id: orderId, restaurantId },
    include: [{ model: TableSession }]
  });
  
  if (!order) throw new AppError('Pedido não encontrado', 404);

  order.status = status;
  await order.save();

  return order;
};

exports.getSessionOrders = async (sessionId) => {
  return await Order.findAll({
    where: { tableSessionId: sessionId },
    include: [{ model: OrderItem, as: 'items', include: [Product] }],
    order: [['createdAt', 'DESC']]
  });
};

exports.getActiveOrders = async (restaurantId) => {
  return await Order.findAll({
    where: { 
      restaurantId,
      status: ['pending', 'accepted', 'preparing', 'ready']
    },
    include: [
      { 
        model: TableSession, 
        include: [{ model: Table }] 
      },
      { model: OrderItem, as: 'items', include: [Product] }
    ],
    order: [['createdAt', 'ASC']]
  });
};