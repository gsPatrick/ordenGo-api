const notificationService = require('./notification.service');
const catchAsync = require('../../utils/catchAsync');

exports.create = catchAsync(async (req, res, next) => {
  // req.restaurantId vem do middleware ou body (se público/tablet)
  const restaurantId = req.restaurantId || req.body.restaurantId;
  
  const notification = await notificationService.createNotification(restaurantId, req.body);

  // 🔥 REAL-TIME: Toca o sino no painel do garçom
  req.io.to(`restaurant_${restaurantId}`).emit('new_notification', notification);

  res.status(201).json({
    status: 'success',
    data: { notification }
  });
});

exports.listPending = catchAsync(async (req, res, next) => {
  const notifications = await notificationService.getPendingNotifications(req.restaurantId);

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    data: { notifications }
  });
});

exports.resolve = catchAsync(async (req, res, next) => {
  const notification = await notificationService.resolveNotification(req.restaurantId, req.params.id);

  // 🔥 REAL-TIME: Remove o alerta da tela de todos os garçons (para ninguém ir atender mesa já atendida)
  req.io.to(`restaurant_${req.restaurantId}`).emit('notification_resolved', { id: notification.id });

  res.status(200).json({
    status: 'success',
    data: { notification }
  });
});