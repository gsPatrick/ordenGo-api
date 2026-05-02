const express = require('express');
const ticketController = require('./ticket.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

router.use(protect);
router.use(restrictTo('superadmin', 'admin_support'));

router.get('/', ticketController.getAllTickets);
router.get('/:id', ticketController.getTicket);
router.patch('/:id/status', ticketController.updateStatus);

// Reply com suporte a múltiplos anexos
router.post('/:id/reply', upload.array('attachments', 5), ticketController.reply);

module.exports = router;
