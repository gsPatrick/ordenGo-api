const express = require('express');
const authController = require('./auth.controller');
const setupController = require('./setup.controller'); // <--- IMPORTAR NOVO CONTROLLER
const { protect } = require('../../middlewares/authMiddleware');

const router = express.Router();

// Rotas de Login
router.post('/login', authController.login);
router.post('/waiter-login', authController.waiterLogin);

// --- NOVA ROTA DE SETUP (PÚBLICA) ---
// O usuário acessa com o código que recebeu (ex: GET /api/v1/auth/setup/A1B2C3)
router.get('/setup/:code', setupController.resolveSetupCode);

// Rotas protegidas
router.get('/me', protect, authController.getMe);

module.exports = router;