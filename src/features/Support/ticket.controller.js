const ticketService = require('./ticket.service');
const catchAsync = require('../../utils/catchAsync');

exports.getAllTickets = catchAsync(async (req, res, next) => {
  // Se for manager, filtra apenas os dele
  const filters = req.user.role === 'superadmin' ? req.query : { ...req.query, restaurantId: req.user.restaurantId };
  const tickets = await ticketService.listAllTickets(filters);
  res.status(200).json({ status: 'success', results: tickets.length, data: { tickets } });
});

exports.getTicket = catchAsync(async (req, res, next) => {
  const ticket = await ticketService.getTicketDetails(req.params.id);
  
  // Segurança: Manager só vê o dele
  if (req.user.role !== 'superadmin' && ticket.restaurantId !== req.user.restaurantId) {
    return next(new AppError('Você não tem permissão para ver este ticket.', 403));
  }
  
  res.status(200).json({ status: 'success', data: { ticket } });
});

exports.createTicket = catchAsync(async (req, res, next) => {
  const { subject, message, priority } = req.body;
  const ticket = await ticketService.createTicket({
    restaurantId: req.user.restaurantId,
    creatorId: req.user.id,
    subject,
    message,
    priority
  });

  res.status(201).json({ status: 'success', data: { ticket } });
});

exports.updateStatus = catchAsync(async (req, res, next) => {
  const ticket = await ticketService.updateTicketStatus(req.params.id, req.body.status);
  res.status(200).json({ status: 'success', data: { ticket } });
});

exports.reply = catchAsync(async (req, res, next) => {
  // Se houver arquivos via multer
  const attachments = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
  
  const message = await ticketService.replyTicket(
    req.params.id, 
    { content: req.body.content, attachments }, 
    req.user, 
    req.user.role === 'superadmin' // isAdmin
  );

  res.status(201).json({ status: 'success', data: { message } });
});
