const { 
  Order, 
  OrderItem, 
  TableSession, 
  Table, 
  Product, 
  ProductVariant, 
  User, 
  sequelize 
} = require('../../models');
const AppError = require('../../utils/AppError');

// ============================================================
// GESTÃO DA SESSÃO DA MESA (Table Session)
// ============================================================

/**
 * Abre uma nova sessão para a mesa (Cliente sentou/escaneou QR).
 * Inclui lógica de Telemetria: Incrementa o contador de sessões da mesa.
 */
exports.startSession = async (restaurantId, tableId, clientName) => {
  const table = await Table.findOne({ where: { id: tableId, restaurantId } });
  
  if (!table) throw new AppError('Mesa não encontrada', 404);

  // Se já tem sessão aberta e ativa, retorna ela (Idempotência para refresh de página)
  if (table.status !== 'free' && table.currentSessionId) {
    return await TableSession.findByPk(table.currentSessionId);
  }

  // Transação para garantir integridade entre Mesa e Sessão
  const transaction = await sequelize.transaction();
  try {
    // 1. Cria a Sessão
    const session = await TableSession.create({
      restaurantId,
      tableId,
      clientName,
      status: 'open',
      openedAt: new Date(),
      totalAmount: 0.00
    }, { transaction });

    // 2. Atualiza a Mesa
    table.status = 'occupied';
    table.currentSessionId = session.id;
    
    // TELEMETRIA: Incrementa contador vitalício de sessões desta mesa
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
 * Fecha a sessão (Conta paga e liberação da mesa).
 * Inclui lógica de Telemetria: Calcula tempo total de ocupação.
 */
exports.closeSession = async (restaurantId, sessionId, paymentMethod) => {
  const session = await TableSession.findOne({ where: { id: sessionId, restaurantId } });
  if (!session) throw new AppError('Sessão não encontrada', 404);
  
  if (session.status === 'closed') throw new AppError('Esta sessão já está fechada.', 400);

  const table = await Table.findByPk(session.tableId);

  const transaction = await sequelize.transaction();
  try {
    // 1. Fecha a sessão
    const now = new Date();
    session.status = 'closed';
    session.closedAt = now;
    session.paymentMethod = paymentMethod;
    await session.save({ transaction });

    // 2. Libera a mesa e Calcula Telemetria
    if (table) {
      table.status = 'free';
      table.currentSessionId = null;

      // TELEMETRIA: Calcular tempo decorrido em segundos
      const startTime = new Date(session.openedAt).getTime();
      const endTime = now.getTime();
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
// GESTÃO DE PEDIDOS (Orders)
// ============================================================

/**
 * Cria um pedido novo (Envia para cozinha).
 * Valida preços no servidor para evitar fraudes no frontend.
 */
exports.createOrder = async (restaurantId, data) => {
  const { tableSessionId, waiterId, items, notes } = data; 
  // items structure: [{ productId, quantity, productVariantId, modifiers: [], observation }]

  const session = await TableSession.findByPk(tableSessionId);
  if (!session || session.status === 'closed') {
    throw new AppError('Sessão inválida ou já fechada. Não é possível fazer pedidos.', 400);
  }

  const transaction = await sequelize.transaction();
  try {
    // 1. Calcular totais validando preços no Banco de Dados
    let orderTotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) throw new AppError(`Produto ID ${item.productId} não encontrado`, 400);

      // Preço Base
      let unitPrice = Number(product.price);

      // Se tiver variante (Tamanho ex: P, M, G), sobrescreve o preço base
      if (item.productVariantId) {
        const variant = await ProductVariant.findByPk(item.productVariantId);
        if (variant) {
          unitPrice = Number(variant.price);
        } else {
          throw new AppError(`Variante ID ${item.productVariantId} inválida`, 400);
        }
      }

      // Somar Modificadores (Adicionais)
      // O frontend envia o array de modifiers escolhidos com seus preços snapshot.
      // Ex: modifiers: [{ name: "Bacon Extra", price: 2.50 }, { name: "Sem Cebola", price: 0 }]
      let modifiersTotal = 0;
      if (item.modifiers && Array.isArray(item.modifiers)) {
        modifiersTotal = item.modifiers.reduce((acc, mod) => acc + Number(mod.price || 0), 0);
      }

      // Cálculo final do item
      const finalUnitPrice = unitPrice + modifiersTotal;
      const itemTotal = finalUnitPrice * item.quantity;
      
      orderTotal += itemTotal;

      // Prepara objeto para salvar
      orderItemsData.push({
        productId: item.productId,
        productVariantId: item.productVariantId || null,
        quantity: item.quantity,
        unitPrice: finalUnitPrice, // Salva o preço final unitário (base + mod) consolidado
        totalPrice: itemTotal,
        modifiers: item.modifiers, // Salva snapshot JSON para histórico exato
        observation: item.observation
      });
    }

    // 2. Criar o Order (Cabeçalho)
    const order = await Order.create({
      restaurantId,
      tableSessionId,
      waiterId: waiterId || null,
      status: 'pending', // Cozinha recebe como Pendente
      total: orderTotal,
      notes
    }, { transaction });

    // 3. Criar os Itens (Bulk Insert para performance)
    const itemsWithOrderId = orderItemsData.map(i => ({ ...i, orderId: order.id }));
    await OrderItem.bulkCreate(itemsWithOrderId, { transaction });

    // 4. Atualizar o Total da Sessão (Cache financeiro)
    session.totalAmount = Number(session.totalAmount) + orderTotal;
    await session.save({ transaction });

    await transaction.commit();

    // 5. Retornar pedido completo (com includes) para emitir no Socket
    // Precisamos buscar de novo para trazer os includes (Product name, etc)
    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { 
          model: OrderItem, 
          as: 'items', 
          include: [{ model: Product, attributes: ['name', 'imageUrl'] }] 
        },
        { 
          model: TableSession, 
          attributes: ['tableId', 'clientName', 'status'],
          include: [{ model: Table, attributes: ['number'] }]
        }
      ]
    });

    return fullOrder;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Atualiza status do pedido (Aceitar, Pronto, Entregue).
 */
exports.updateOrderStatus = async (restaurantId, orderId, status) => {
  // Buscamos com TableSession para saber a mesa e emitir socket depois
  const order = await Order.findOne({ 
    where: { id: orderId, restaurantId },
    include: [{ model: TableSession }] 
  });
  
  if (!order) throw new AppError('Pedido não encontrado', 404);

  // Validação simples de transição de status (opcional, mas recomendada)
  // if (order.status === 'cancelled') throw new AppError('Pedido cancelado não pode ser movido.', 400);

  order.status = status;
  await order.save();

  return order;
};

/**
 * Lista pedidos de uma sessão (Histórico da mesa / "Minha Conta").
 */
exports.getSessionOrders = async (sessionId) => {
  return await Order.findAll({
    where: { tableSessionId: sessionId },
    include: [
      { 
        model: OrderItem, 
        as: 'items', 
        include: [{ model: Product, attributes: ['name', 'imageUrl'] }] 
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Lista pedidos ATIVOS do Restaurante (Para o KDS / Painel do Garçom).
 * Filtra pedidos finalizados/pagos para não poluir a tela da cozinha.
 */
exports.getActiveOrders = async (restaurantId) => {
  return await Order.findAll({
    where: { 
      restaurantId,
      // Mostra apenas o fluxo de produção
      status: ['pending', 'accepted', 'preparing', 'ready'] 
    },
    include: [
      { 
        model: TableSession, 
        include: [{ model: Table, attributes: ['number'] }] // "Mesa 10"
      },
      { 
        model: OrderItem, 
        as: 'items', 
        include: [{ model: Product, attributes: ['name'] }] 
      }
    ],
    order: [['createdAt', 'ASC']] // FIFO (First In, First Out) - Os mais antigos primeiro
  });
};