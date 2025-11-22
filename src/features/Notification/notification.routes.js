const express = require('express');
const notificationController = require('./notification.controller');
const { protect } = require('../../middlewares/authMiddleware');

const router = express.Router();

// ============================================================
// ROTA PÚBLICA (Tablet)
// ============================================================
// Tablet envia POST /api/notifications com { tableId, type, restaurantId }
router.post('/', notificationController.create);


// ============================================================
// ROTAS PROTEGIDAS (Garçom/Gerente)
// ============================================================
router.use(protect);

router.get('/', notificationController.listPending);
router.patch('/:id/resolve', notificationController.resolve);

module.exports = router;