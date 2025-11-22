const { Notification, Table, TableSession, sequelize } = require('../../models');
const AppError = require('../../utils/AppError');

/**
 * Cria uma notificação vinda da mesa
 */
exports.createNotification = async (restaurantId, data) => {
  const { tableId, type } = data; // type: 'CALL_WAITER' | 'REQUEST_BILL'

  // 1. Verificar se já existe um chamado pendente desse tipo para essa mesa
  // Isso evita spam se o cliente clicar 10 vezes no botão
  const existingNotification = await Notification.findOne({
    where: {
      restaurantId,
      tableId,
      type,
      status: 'pending'
    }
  });

  if (existingNotification) {
    // Se já existe, retornamos ela sem criar nova (idempotência)
    return existingNotification;
  }

  // 2. Criar a notificação
  const notification = await Notification.create({
    restaurantId,
    tableId,
    type,
    status: 'pending'
  });

  // 3. Buscar dados completos (incluindo nome da mesa) para o Socket enviar bonito
  const fullNotification = await Notification.findByPk(notification.id, {
    include: [{ model: Table, attributes: ['number'] }]
  });

  // Regra de Negócio: Se for "Pedir Conta", podemos atualizar o status da mesa visualmente
  if (type === 'REQUEST_BILL') {
    await Table.update({ status: 'closing' }, { where: { id: tableId } });
  } else if (type === 'CALL_WAITER') {
    // Se a mesa estava ocupada, muda para chamando. Se estava livre, mantem livre (estranho, mas seguro)
    const table = await Table.findByPk(tableId);
    if (table.status === 'occupied') {
      table.status = 'calling';
      await table.save();
    }
  }

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
    order: [['createdAt', 'ASC']] // Os mais antigos primeiro
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
    // Se era pedido de conta ou chamado, e a mesa não foi fechada ainda, volta para 'occupied'
    if (['calling', 'closing'].includes(table.status)) {
      // Verifica se ainda tem sessão aberta
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