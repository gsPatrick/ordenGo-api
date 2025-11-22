const express = require('express');
const notificationController = require('./notification.controller');
const { protect } = require('../../middlewares/authMiddleware');

const router = express.Router();

// ROTA PÚBLICA (Tablet)
router.post('/', notificationController.create);

// ROTAS PROTEGIDAS (Garçom)
router.use(protect);

router.get('/', notificationController.listPending);
router.patch('/:id/resolve', notificationController.resolve);

// --- NOVA ROTA DE INSCRIÇÃO ---
// Garçom manda POST /api/v1/notifications/subscribe com o JSON do pushManager
router.post('/subscribe', notificationController.subscribePush);

module.exports = router;