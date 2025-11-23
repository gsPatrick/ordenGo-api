const notificationService = require('./notification.service');
const catchAsync = require('../../utils/catchAsync');

exports.create = catchAsync(async (req, res, next) => {
  const restaurantId = req.restaurantId || req.body.restaurantId;
  
  const notification = await notificationService.createNotification(restaurantId, req.body);

  if (req.io) {
    // Avisa que tem nova notificação
    req.io.to(`restaurant_${restaurantId}`).emit('new_notification', notification);
    
    // Avisa que a mesa mudou de status (ficou amarela/vermelha)
    // Precisamos buscar a mesa atualizada para enviar o status correto, 
    // mas o createNotification já atualizou o DB. O front vai pegar no polling ou podemos forçar aqui.
    // Para simplificar, emitimos apenas a notification, o front já reage a isso.
  }

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

// --- CORREÇÃO AQUI ---
exports.resolve = catchAsync(async (req, res, next) => {
  // O service agora retorna { notification, table }
  const { notification, table } = await notificationService.resolveNotification(req.restaurantId, req.params.id);

  // 🔥 REAL-TIME (SOCKET):
  if (req.io) {
    const room = `restaurant_${req.restaurantId}`;
    
    // 1. Remove o alerta da tela de todos
    req.io.to(room).emit('notification_resolved', { id: notification.id });

    // 2. Atualiza o status da mesa na tela de todos (volta para Ocupada/Verde/Azul)
    if (table) {
      req.io.to(room).emit('table_updated', table);
    }
  }

  res.status(200).json({
    status: 'success',
    data: { notification }
  });
});

exports.subscribePush = catchAsync(async (req, res, next) => {
  await notificationService.subscribeToPush(
    req.restaurantId, 
    req.user.id, 
    req.body
  );

  res.status(200).json({
    status: 'success',
    message: 'Notificações Push ativadas com sucesso!'
  });
});