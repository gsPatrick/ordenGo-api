const express = require('express');
const orderController = require('./order.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// --- ROTA PÚBLICA (Tablet) ---

router.post('/session/start', (req, res, next) => {
    if (req.body.restaurantId) req.restaurantId = req.body.restaurantId;
    next();
}, orderController.startSession);

router.get('/session/validate/:token', orderController.validateSession);

// --- ROTAS MISTAS (Tablet + Garçom) ---

router.post('/', (req, res, next) => {
    if (req.body.restaurantId) req.restaurantId = req.body.restaurantId;
    next();
}, orderController.placeOrder);

router.get('/session/:sessionId', orderController.getSessionDetails);

// --- ROTAS PROTEGIDAS (Apenas Equipe) ---
router.use(protect);

router.get('/active', orderController.listActiveOrders);
router.patch('/:id/status', orderController.updateStatus);
router.post('/session/:id/close', orderController.closeSession);

module.exports = router;