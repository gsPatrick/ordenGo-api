const notificationService = require('./notification.service');
const catchAsync = require('../../utils/catchAsync');

// ============================================================
// CRIAÇÃO E LISTAGEM
// ============================================================

exports.create = catchAsync(async (req, res, next) => {
  // req.restaurantId vem do middleware (se logado) ou body (se público/tablet)
  const restaurantId = req.restaurantId || req.body.restaurantId;
  
  const notification = await notificationService.createNotification(restaurantId, req.body);

  // 🔥 REAL-TIME (SOCKET): Toca o sino no painel do garçom que estiver com o app aberto
  if (req.io) {
    req.io.to(`restaurant_${restaurantId}`).emit('new_notification', notification);
  }

  // NOTA: O disparo do Web Push (celular bloqueado) acontece dentro do notification.service.js 
  // para não bloquear a resposta da API.

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

// ============================================================
// RESOLUÇÃO
// ============================================================

exports.resolve = catchAsync(async (req, res, next) => {
  const notification = await notificationService.resolveNotification(req.restaurantId, req.params.id);

  // 🔥 REAL-TIME (SOCKET): Remove o alerta da tela de todos os garçons
  // (para ninguém ir atender uma mesa que já foi atendida por outro colega)
  if (req.io) {
    req.io.to(`restaurant_${req.restaurantId}`).emit('notification_resolved', { id: notification.id });
  }

  res.status(200).json({
    status: 'success',
    data: { notification }
  });
});

// ============================================================
// WEB PUSH (PWA)
// ============================================================

exports.subscribePush = catchAsync(async (req, res, next) => {
  // Rota chamada pelo App do Garçom quando ele clica em "Ativar Notificações"
  // req.body contém o objeto 'subscription' gerado pelo navegador (endpoint, keys)
  // req.user.id vem do token de autenticação do garçom
  
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