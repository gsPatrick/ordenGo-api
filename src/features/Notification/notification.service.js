const webpush = require('web-push');
const { Notification, Table, PushSubscription, sequelize } = require('../../models');
const AppError = require('../../utils/AppError');

// ============================================================
// CONFIGURAÇÃO DO WEB PUSH
// ============================================================
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@ordengo.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ============================================================
// FUNÇÕES AUXILIARES DE PUSH (Subscrição e Envio)
// ============================================================

/**
 * Salva a inscrição do navegador do garçom no banco de dados.
 */
exports.subscribeToPush = async (restaurantId, userId, subscription) => {
  // Verifica se já existe esse endpoint para evitar duplicação
  const existing = await PushSubscription.findOne({ where: { endpoint: subscription.endpoint } });
  
  if (existing) {
    // Se mudou o usuário logado no mesmo navegador, atualiza o vínculo
    if (existing.userId !== userId) {
        existing.userId = userId;
        existing.restaurantId = restaurantId;
        await existing.save();
    }
    return existing;
  }

  // Cria nova inscrição
  return await PushSubscription.create({
    restaurantId,
    userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys
  });
};

/**
 * Dispara notificação para TODOS os garçons do restaurante.
 */
const sendPushToRestaurantTeam = async (restaurantId, payload) => {
  try {
    // 1. Busca todas as inscrições válidas deste restaurante
    const subscriptions = await PushSubscription.findAll({ where: { restaurantId } });
    
    if (subscriptions.length === 0) return;

    const payloadString = JSON.stringify(payload);

    // 2. Dispara para todos em paralelo
    const promises = subscriptions.map(sub => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: sub.keys
      };

      return webpush.sendNotification(pushConfig, payloadString)
        .catch(async (err) => {
          // Erro 410 ou 404 significa que a inscrição expirou ou usuário removeu permissão
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`🗑️ Removendo subscrição inválida: ${sub.id}`);
            await sub.destroy(); 
          } else {
            console.error('Erro ao enviar push:', err);
          }
        });
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Erro geral no disparo de Push:', error);
  }
};


// ============================================================
// LÓGICA DE NOTIFICAÇÃO (CORE)
// ============================================================

/**
 * Cria uma nova notificação (Chamado da Mesa).
 * Suporta método de pagamento e resolução de ID/UUID.
 */
exports.createNotification = async (restaurantId, data) => {
  const { tableId: tableIdInput, type, paymentMethod } = data; 

  // 1. BUSCAR A MESA CORRETA (Resolve erro UUID vs Integer)
  let table;
  if (!isNaN(tableIdInput) && !String(tableIdInput).includes('-')) {
    // Se for número (1), busca pelo ID inteiro
    table = await Table.findOne({ where: { id: tableIdInput, restaurantId } });
  } else {
    // Se for string (UUID), busca pelo UUID
    table = await Table.findOne({ where: { uuid: tableIdInput, restaurantId } });
  }

  if (!table) {
    throw new AppError('Mesa não encontrada para enviar notificação.', 404);
  }

  const realTableUUID = table.uuid;

  // 2. DESDUPLICAÇÃO: Verificar se já existe um chamado pendente igual
  const existingNotification = await Notification.findOne({
    where: { 
      restaurantId, 
      tableId: realTableUUID, 
      type, 
      status: 'pending' 
    }
  });

  if (existingNotification) {
    return existingNotification;
  }

  // 3. CRIAR A NOTIFICAÇÃO
  const notification = await Notification.create({
    restaurantId,
    tableId: realTableUUID,
    type,
    paymentMethod: paymentMethod || null, // Salva ex: 'pix', 'credit'
    status: 'pending'
  });

  // 4. Busca infos completas para retorno
  const fullNotification = await Notification.findByPk(notification.id, {
    include: [{ model: Table, attributes: ['number'] }]
  });

  // 5. ATUALIZAR STATUS VISUAL DA MESA
  if (type === 'REQUEST_BILL') {
    table.status = 'closing'; // Vermelho/Fechamento
    await table.save();
  } else if (type === 'CALL_WAITER') {
    if (table.status === 'occupied') {
      table.status = 'calling'; // Amarelo/Chamando
      await table.save();
    }
  }

  // 6. DISPARAR O PUSH NOTIFICATION
  const title = `Mesa ${table.number}`;
  let body = '';

  if (type === 'REQUEST_BILL') {
    // Formata texto amigável para o método de pagamento
    const paymentLabels = {
        'credit': '💳 Crédito',
        'debit': '💳 Débito',
        'pix': '💠 PIX',
        'cash': '💵 Dinheiro',
        'split': '➗ Dividir Conta'
    };
    
    const methodText = paymentMethod && paymentLabels[paymentMethod] 
        ? `via ${paymentLabels[paymentMethod]}` 
        : '';

    body = `💰 Pediu a conta! ${methodText}`;
  } else {
    body = '👋 Chamando garçom!';
  }
  
  // Envia sem await para não travar a resposta HTTP
  sendPushToRestaurantTeam(restaurantId, {
    title: title,
    body: body,
    icon: '/icons/icon-192x192.png', // Ajuste conforme assets do front
    badge: '/icons/badge.png',
    data: {
      url: `/waiter/tables`
    }
  });

  return fullNotification;
};

/**
 * Lista todas as notificações pendentes
 */
exports.getPendingNotifications = async (restaurantId) => {
  return await Notification.findAll({
    where: { 
      restaurantId, 
      status: 'pending' 
    },
    include: [
      { model: Table, attributes: ['number'] }
    ],
    order: [['createdAt', 'ASC']] // FIFO
  });
};

/**
 * Marca como resolvido e reverte status da mesa
 */
exports.resolveNotification = async (restaurantId, notificationId) => {
  const notification = await Notification.findOne({ 
    where: { id: notificationId, restaurantId } 
  });

  if (!notification) {
    throw new AppError('Notificação não encontrada', 404);
  }

  notification.status = 'resolved';
  notification.resolvedAt = new Date();
  await notification.save();

  // Reverter status da mesa
  const table = await Table.findOne({ 
    where: { uuid: notification.tableId } 
  });

  if (table && ['calling', 'closing'].includes(table.status)) {
    // Se tem sessão aberta, volta para ocupada. Se não, volta para livre.
    if (table.currentSessionId) {
      table.status = 'occupied';
    } else {
      table.status = 'free';
    }
    await table.save();
  }

  // RETORNA UM OBJETO COM A NOTIFICAÇÃO E A MESA ATUALIZADA
  return { notification, table };
};