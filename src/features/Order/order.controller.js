const orderService = require('./order.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { Notification, Table } = require('../../models'); // <--- IMPORTAR MODELS

// --- SESSÃO ---

exports.startSession = catchAsync(async (req, res, next) => {
  // MUDANÇA: Removemos clientName do body. Apenas tableId importa.
  const { tableId } = req.body;
  
  const restaurantId = req.restaurantId || req.body.restaurantId;

  if (!restaurantId) {
    return next(new AppError('O ID do Restaurante é obrigatório.', 400));
  }

  if (!tableId) {
    return next(new AppError('O ID da Mesa é obrigatório.', 400));
  }

  // Chamamos o serviço sem passar nome
  const session = await orderService.startSession(restaurantId, tableId);

  res.status(200).json({ status: 'success', data: { session } });
});

exports.closeSession = catchAsync(async (req, res, next) => {
  const { paymentMethod } = req.body;
  const session = await orderService.closeSession(req.restaurantId, req.params.id, paymentMethod);
  
  // --- CORREÇÃO 1: Limpar TODAS as notificações pendentes desta mesa ---
  // Isso impede que sobrem notificações antigas após fechar a conta
  await Notification.update(
    { status: 'resolved', resolvedAt: new Date() },
    { 
      where: { 
        tableId: session.tableId, // UUID da mesa
        status: 'pending' 
      } 
    }
  );

  const io = req.io;
  const restaurantRoom = `restaurant_${req.restaurantId}`;
  
  // Avisa o Dashboard (Limpa alertas e muda cor da mesa)
  io.to(restaurantRoom).emit('table_freed', { tableId: session.tableId });
  
  // Emite evento para limpar notificações visuais no painel do garçom
  // (Caso o frontend do garçom esteja ouvindo especificamente remoções)
  io.to(restaurantRoom).emit('notifications_cleared', { tableId: session.tableId });

  // Avisa o Tablet da Mesa
  io.to(`table_${session.tableId}`).emit('session_closed', { tableId: session.tableId });

  res.status(200).json({ status: 'success', data: { session } });
});

exports.getSessionDetails = catchAsync(async (req, res, next) => {
  const orders = await orderService.getSessionOrders(req.params.sessionId);
  res.status(200).json({ status: 'success', data: { orders } });
});

// --- PEDIDOS ---

exports.placeOrder = catchAsync(async (req, res, next) => {
  const waiterId = req.user ? req.user.id : null; 
  
  const restaurantId = req.restaurantId || req.body.restaurantId;
  if (!restaurantId) return next(new AppError('Restaurant ID não identificado.', 400));

  const orderData = { ...req.body, waiterId };
  const order = await orderService.createOrder(restaurantId, orderData);

  req.io.to(`restaurant_${restaurantId}`).emit('new_order', order);

  res.status(201).json({ status: 'success', data: { order } });
});

exports.updateStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const order = await orderService.updateOrderStatus(req.restaurantId, req.params.id, status);

  const tableId = order.TableSession.tableId;
  req.io.to(`table_${tableId}`).emit('order_status_update', { 
    orderId: order.id, 
    status: order.status 
  });
  
  req.io.to(`restaurant_${req.restaurantId}`).emit('order_updated', order);

  res.status(200).json({ status: 'success', data: { order } });
});

exports.listActiveOrders = catchAsync(async (req, res, next) => {
  const orders = await orderService.getActiveOrders(req.restaurantId);
  res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
});