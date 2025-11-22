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
}

// ============================================================
// FUNÇÕES AUXILIARES DE PUSH (Subscrição e Envio)
// ============================================================

/**
 * Salva a inscrição do navegador do garçom no banco de dados.
 * Isso permite que ele receba notificações mesmo com o celular bloqueado.
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
 * Função interna para disparar notificação para TODOS os garçons do restaurante.
 */
const sendPushToRestaurantTeam = async (restaurantId, payload) => {
  try {
    // 1. Busca todas as inscrições válidas deste restaurante
    const subscriptions = await PushSubscription.findAll({ where: { restaurantId } });
    
    if (subscriptions.length === 0) return; // Ninguém inscrito

    const payloadString = JSON.stringify(payload);

    // 2. Dispara para todos em paralelo
    const promises = subscriptions.map(sub => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: sub.keys
      };

      return webpush.sendNotification(pushConfig, payloadString)
        .catch(async (err) => {
          // Se der erro 410 (Gone) ou 404, significa que o usuário limpou cookies ou desinstalou
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`🗑️ Removendo subscrição inválida/expirada: ${sub.id}`);
            await sub.destroy(); // Limpa do banco para não tentar enviar de novo
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
 * Resolve automaticamente o problema de ID Numérico vs UUID.
 */
exports.createNotification = async (restaurantId, data) => {
  const { tableId: tableIdInput, type } = data; // type: 'CALL_WAITER' | 'REQUEST_BILL'

  // 1. BUSCAR A MESA CORRETA (Correção do erro "operator does not exist: uuid = integer")
  // O frontend pode mandar "1" (number) ou "uuid-string". O banco precisa do UUID.
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

  const realTableUUID = table.uuid; // O UUID real que o banco espera

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
    // Se já existe, retorna ela sem criar spam no banco
    return existingNotification;
  }

  // 3. CRIAR A NOTIFICAÇÃO
  const notification = await Notification.create({
    restaurantId,
    tableId: realTableUUID,
    type,
    status: 'pending'
  });

  // 4. Busca infos completas para retorno (incluindo o número da mesa para exibir)
  const fullNotification = await Notification.findByPk(notification.id, {
    include: [{ model: Table, attributes: ['number'] }]
  });

  // 5. ATUALIZAR STATUS VISUAL DA MESA
  if (type === 'REQUEST_BILL') {
    table.status = 'closing'; // Muda cor para Vermelho/Fechamento
    await table.save();
  } else if (type === 'CALL_WAITER') {
    // Apenas muda para chamando se estiver ocupada (para não bugar mesa livre)
    if (table.status === 'occupied') {
      table.status = 'calling'; // Muda cor para Amarelo/Chamando
      await table.save();
    }
  }

  // 6. DISPARAR O PUSH NOTIFICATION (FIRE & FORGET)
  // Não usamos await aqui para não atrasar a resposta da API para o tablet
  const title = `Mesa ${table.number}`;
  const body = type === 'REQUEST_BILL' ? '💰 Pediu a conta!' : '👋 Chamando garçom!';
  
  sendPushToRestaurantTeam(restaurantId, {
    title: title,
    body: body,
    icon: '/icons/icon-192x192.png', // Ajuste conforme seu frontend
    badge: '/icons/badge.png',
    data: {
      url: `/waiter/tables` // URL para o garçom abrir ao clicar
    }
  });

  return fullNotification;
};

/**
 * Lista todas as notificações pendentes para o Painel do Garçom
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
    order: [['createdAt', 'ASC']] // FIFO: Atender quem chamou primeiro
  });
};

/**
 * Marca a notificação como resolvida (Atendida)
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

  // 7. REVERTER STATUS DA MESA
  // Se o garçom atendeu o chamado, a mesa para de "piscar" (volta ao estado normal)
  const table = await Table.findByPk(notification.tableId);
  if (table && ['calling', 'closing'].includes(table.status)) {
    // Se tem sessão aberta, volta para ocupada. Se não, volta para livre.
    if (table.currentSessionId) {
      table.status = 'occupied';
    } else {
      table.status = 'free';
    }
    await table.save();
  }

  return notification;
};