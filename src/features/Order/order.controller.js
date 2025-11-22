const orderService = require('./order.service');
const catchAsync = require('../../utils/catchAsync');

// --- SESSÃO ---

exports.startSession = catchAsync(async (req, res, next) => {
  const { tableId, clientName } = req.body;
  // req.restaurantId vem do token (se for tablet autenticado) ou params
  const session = await orderService.startSession(req.restaurantId, tableId, clientName);

  res.status(200).json({ status: 'success', data: { session } });
});

exports.closeSession = catchAsync(async (req, res, next) => {
  const { paymentMethod } = req.body;
  const session = await orderService.closeSession(req.restaurantId, req.params.id, paymentMethod);
  
  // Avisar garçons que a mesa ficou livre
  req.io.to(`restaurant_${req.restaurantId}`).emit('table_freed', { tableId: session.tableId });

  res.status(200).json({ status: 'success', data: { session } });
});

exports.getSessionDetails = catchAsync(async (req, res, next) => {
  const orders = await orderService.getSessionOrders(req.params.sessionId);
  res.status(200).json({ status: 'success', data: { orders } });
});

// --- PEDIDOS ---

exports.placeOrder = catchAsync(async (req, res, next) => {
  // Se for garçom lançando, req.user.id existe. Se for tablet, pode não ter user.
  const waiterId = req.user ? req.user.id : null; 
  
  const orderData = { ...req.body, waiterId };
  const order = await orderService.createOrder(req.restaurantId, orderData);

  // 🔥 REAL-TIME MAGIC
  // 1. Avisar Painel do Garçom/Cozinha ("Novo pedido na Mesa X")
  req.io.to(`restaurant_${req.restaurantId}`).emit('new_order', order);

  res.status(201).json({ status: 'success', data: { order } });
});

exports.updateStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const order = await orderService.updateOrderStatus(req.restaurantId, req.params.id, status);

  // 🔥 REAL-TIME MAGIC
  // 1. Avisar a Mesa ("Seu pedido está pronto")
  // order.TableSession.tableId é necessário aqui
  // Vamos emitir para a sala da mesa
  const tableId = order.TableSession.tableId;
  req.io.to(`table_${tableId}`).emit('order_status_update', { 
    orderId: order.id, 
    status: order.status 
  });
  
  // 2. Atualizar listas dos outros garçons
  req.io.to(`restaurant_${req.restaurantId}`).emit('order_updated', order);

  res.status(200).json({ status: 'success', data: { order } });
});

exports.listActiveOrders = catchAsync(async (req, res, next) => {
  const orders = await orderService.getActiveOrders(req.restaurantId);
  res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
});