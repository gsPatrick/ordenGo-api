const express = require('express');
const authController = require('./auth.controller');
const { protect } = require('../../middlewares/authMiddleware'); // Vamos criar este arquivo abaixo

const router = express.Router();

router.post('/login', authController.login);
router.post('/waiter-login', authController.waiterLogin);

// Rotas protegidas
router.get('/me', protect, authController.getMe);

module.exports = router;