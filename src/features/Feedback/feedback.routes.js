const express = require('express');
const feedbackController = require('./feedback.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// ============================================================
// ROTA PÚBLICA (Tablet)
// ============================================================
router.post('/', feedbackController.create);


// ============================================================
// ROTAS PROTEGIDAS (Gerente)
// ============================================================
router.use(protect);
router.use(restrictTo('manager', 'admin'));

router.get('/summary', feedbackController.getSummary); // Aba 1: Resumo
router.get('/', feedbackController.list); // Aba 2: Comentários

module.exports = router;