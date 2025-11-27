const express = require('express');
const planController = require('./plan.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// Proteção Global: Apenas SuperAdmin pode gerenciar planos
// (Futuramente, Admin de Vendas/Financeiro também)
router.use(protect);
router.use(restrictTo('superadmin', 'admin_sales', 'admin_finance'));

router
  .route('/')
  .get(planController.listPlans)
  .post(planController.createPlan);

router
  .route('/:id')
  .get(planController.getPlan)
  .patch(planController.updatePlan);

// Rota específica para ativar/desativar (mais seguro que DELETE)
router.patch('/:id/toggle', planController.toggleStatus);

module.exports = router;