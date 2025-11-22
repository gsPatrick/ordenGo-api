const express = require('express');
const orderController = require('./order.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// --- ROTA PÚBLICA (Tablet) ---
// Middleware para injetar restaurantId se vier por parametro (caso nao use o token global ainda)
// Para simplificar, vamos assumir que o tablet tem um token JWT de "Mesa" ou passa o ID no header.
// No cenário real, usamos o 'protect' mas permitimos um user "anônimo" se tiver token da mesa.
// Abaixo, vou usar uma abordagem híbrida:

router.post('/session/start', (req, res, next) => {
    // Middleware inline simples para pegar ID se vier no body (tablet)
    if(req.body.restaurantId) req.restaurantId = req.body.restaurantId; 
    next();
}, orderController.startSession);


// --- ROTAS MISTAS (Tablet + Garçom) ---
// O cliente pode fazer pedido, o garçom também.
// Precisamos garantir que req.restaurantId esteja preenchido.
router.post('/', (req, res, next) => {
    if(req.body.restaurantId) req.restaurantId = req.body.restaurantId;
    // Se estiver logado como garçom, o 'protect' abaixo preenche. Se for cliente, preenchemos acima.
    next();
}, orderController.placeOrder);

router.get('/session/:sessionId', orderController.getSessionDetails); // Cliente ver histórico


// --- ROTAS PROTEGIDAS (Apenas Equipe) ---
router.use(protect); // Exige Token JWT de Usuário (Garçom/Gerente)

router.get('/active', orderController.listActiveOrders); // KDS (Kitchen Display System)
router.patch('/:id/status', orderController.updateStatus); // Garçom avisa que entregou
router.post('/session/:id/close', orderController.closeSession); // Fechar conta (pagamento)

module.exports = router;