const ticketService = require('./ticket.service');
const catchAsync = require('../../utils/catchAsync');

exports.getAllTickets = catchAsync(async (req, res, next) => {
  const tickets = await ticketService.listAllTickets(req.query);
  res.status(200).json({ status: 'success', results: tickets.length, data: { tickets } });
});

exports.getTicket = catchAsync(async (req, res, next) => {
  const ticket = await ticketService.getTicketDetails(req.params.id);
  res.status(200).json({ status: 'success', data: { ticket } });
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
    true // isAdmin
  );

  res.status(201).json({ status: 'success', data: { message } });
});
