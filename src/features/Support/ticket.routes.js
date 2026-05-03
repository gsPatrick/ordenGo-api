const express = require('express');
const ticketController = require('./ticket.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

router.use(protect);

router.get('/', restrictTo('superadmin', 'admin_support', 'manager', 'admin'), ticketController.getAllTickets);
router.get('/:id', restrictTo('superadmin', 'admin_support', 'manager', 'admin'), ticketController.getTicket);
router.post('/', restrictTo('manager', 'admin'), ticketController.createTicket);
router.patch('/:id/status', restrictTo('superadmin', 'admin_support'), ticketController.updateStatus);

// Reply com suporte a múltiplos anexos
router.post('/:id/reply', restrictTo('superadmin', 'admin_support', 'manager', 'admin'), upload.array('attachments', 5), ticketController.reply);

module.exports = router;
