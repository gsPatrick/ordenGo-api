const express = require('express');
const dashboardController = require('./dashboard.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// Proteção Global (Precisa estar logado)
router.use(protect);

// 1. Rota do Gerente (Vê apenas os dados do PRÓPRIO restaurante)
// GET /api/v1/dashboard/manager?startDate=2023-10-01&endDate=2023-10-30
router.get(
  '/manager', 
  restrictTo('manager', 'admin'), // Garçons não veem faturamento
  dashboardController.getManagerDashboard
);

// 2. Rota do SuperAdmin (Vê dados globais do SaaS)
// GET /api/v1/dashboard/superadmin
router.get(
  '/superadmin', 
  restrictTo('superadmin'), 
  dashboardController.getSuperAdminDashboard
);

module.exports = router;