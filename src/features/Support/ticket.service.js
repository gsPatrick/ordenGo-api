const { Ticket, TicketMessage, Restaurant, User } = require('../../models');
const AppError = require('../../utils/AppError');

exports.listAllTickets = async (filters = {}) => {
  return await Ticket.findAll({
    where: filters,
    include: [
      { model: Restaurant, attributes: ['name', 'slug'] },
      { model: User, as: 'creator', attributes: ['name', 'email'] }
    ],
    order: [['updatedAt', 'DESC']]
  });
};

exports.getTicketDetails = async (id) => {
  const ticket = await Ticket.findByPk(id, {
    include: [
      { model: Restaurant, attributes: ['name', 'slug'] },
      { model: User, as: 'creator', attributes: ['name', 'email'] },
      { 
        model: TicketMessage, 
        as: 'messages',
        include: [{ model: User, as: 'sender', attributes: ['name', 'email'] }],
        order: [['createdAt', 'ASC']]
      }
    ]
  });
  if (!ticket) throw new AppError('Ticket no encontrado', 404);
  return ticket;
};

exports.updateTicketStatus = async (id, status) => {
  const ticket = await Ticket.findByPk(id);
  if (!ticket) throw new AppError('Ticket no encontrado', 404);
  
  ticket.status = status;
  await ticket.save();
  return ticket;
};

exports.replyTicket = async (id, data, sender, isAdmin = true) => {
  const { content, attachments } = data;
  const ticket = await Ticket.findByPk(id);
  if (!ticket) throw new AppError('Ticket no encontrado', 404);

  const message = await TicketMessage.create({
    ticketId: id,
    senderId: sender.id,
    content,
    attachments: attachments || [],
    isAdminReply: isAdmin
  });

  // Atualiza status do ticket automaticamente
  ticket.status = isAdmin ? 'in_progress' : 'open';
  await ticket.save();
  
  return message;
};
