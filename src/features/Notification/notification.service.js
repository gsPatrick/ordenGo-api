const webpush = require('web-push');
const { Notification, Table, PushSubscription, sequelize } = require('../../models');
const AppError = require('../../utils/AppError');

// ============================================================
// CONFIGURAÇÃO DO WEB PUSH
// ============================================================
// Configura apenas se as chaves estiverem presentes no .env
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@ordengo.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️ Chaves VAPID não configuradas. Notificações Push não funcionarão.');
}

// ============================================================
// FUNÇÕES AUXILIARES DE PUSH (SUBSCRIPTION & SENDING)
// ============================================================

/**
 * Salva ou atualiza a inscrição do navegador do garçom no banco
 */
exports.subscribeToPush = async (restaurantId, userId, subscription) => {
  // subscription vem do frontend: { endpoint: '...', keys: { p256dh: '...', auth: '...' } }
  
  if (!subscription || !subscription.endpoint) {
    throw new AppError('Dados de inscrição inválidos.', 400);
  }

  // Verifica se já existe esse endpoint para evitar duplicação
  const existing = await PushSubscription.findOne({ where: { endpoint: subscription.endpoint } });
  
  if (existing) {
    // Se mudou o usuário logado no mesmo navegador/dispositivo, atualiza o dono
    if (existing.userId !== userId || existing.restaurantId !== restaurantId) {
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
 * Envia notificação PUSH para TODOS os garçons do restaurante
 * Função interna, não exportada diretamente para o controller
 */
const sendPushToRestaurantTeam = async (restaurantId, payload) => {
  try {
    // 1. Busca todas as inscrições deste restaurante
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
          // Se der erro 410 (Gone) ou 404, significa que o usuário revogou a permissão ou desinstalou
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`🗑️ Removendo subscrição inválida (Garçom desconectado): ${sub.id}`);
            await sub.destroy(); // Limpa do banco para não tentar enviar de novo
          } else {
            console.error('Erro ao enviar push individual:', err);
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
 * Cria uma notificação (Chamado da Mesa) e dispara o Push
 */
exports.createNotification = async (restaurantId, data) => {
  const { tableId, type } = data; // type: 'CALL_WAITER' | 'REQUEST_BILL'

  // 1. Verificar se já existe um chamado pendente desse tipo para essa mesa (Desduplicação)
  const existingNotification = await Notification.findOne({
    where: {
      restaurantId,
      tableId,
      type,
      status: 'pending'
    }
  });

  if (existingNotification) {
    // Se já existe, retornamos ela sem criar nova e sem spammar push
    return existingNotification;
  }

  // 2. Criar a notificação no banco
  const notification = await Notification.create({
    restaurantId,
    tableId,
    type,
    status: 'pending'
  });

  // 3. Buscar dados completos (incluindo nome da mesa) para o texto do Push
  const fullNotification = await Notification.findByPk(notification.id, {
    include: [{ model: Table, attributes: ['number'] }]
  });

  // 4. Atualizar status visual da mesa (Regra de Negócio)
  if (type === 'REQUEST_BILL') {
    await Table.update({ status: 'closing' }, { where: { id: tableId } });
  } else if (type === 'CALL_WAITER') {
    const table = await Table.findByPk(tableId);
    // Apenas muda para chamando se a mesa estiver ocupada (para não bugar mesas livres)
    if (table && table.status === 'occupied') {
      table.status = 'calling';
      await table.save();
    }
  }

  // 5. 🔥 DISPARAR O PUSH NOTIFICATION 🔥
  // Rodamos sem 'await' no retorno principal para não travar a resposta HTTP para o tablet
  const title = `Mesa ${fullNotification.Table ? fullNotification.Table.number : '?'}`;
  const body = type === 'REQUEST_BILL' ? '💰 Pediu a conta!' : '👋 Chamando garçom!';
  
  // O payload depende de como seu Service Worker no frontend trata
  sendPushToRestaurantTeam(restaurantId, {
    title: title,
    body: body,
    icon: '/icons/icon-192x192.png', // Ajuste conforme seus assets do PWA
    data: {
      url: `/waiter/tables` // URL para o garçom abrir ao clicar na notificação
    }
  });

  return fullNotification;
};

/**
 * Lista todas as notificações PENDENTES (Painel do Garçom)
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
    order: [['createdAt', 'ASC']] // Os mais antigos primeiro (FIFO)
  });
};

/**
 * Marca como Resolvido (Garçom atendeu)
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

  // Reverter status da mesa se necessário
  const table = await Table.findByPk(notification.tableId);
  if (table) {
    // Se era pedido de conta ou chamado, e a mesa não foi fechada ainda, volta para o status correto
    if (['calling', 'closing'].includes(table.status)) {
      // Verifica se ainda tem sessão aberta para decidir se volta para Occupied ou Free
      if (table.currentSessionId) {
        table.status = 'occupied';
      } else {
        table.status = 'free';
      }
      await table.save();
    }
  }

  return notification;
};