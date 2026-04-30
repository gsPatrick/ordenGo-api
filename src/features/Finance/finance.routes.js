const express = require('express');
const financeController = require('./finance.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// Proteção Máxima: Apenas SuperAdmin e Admin Financeiro
router.use(protect);
router.use(restrictTo('superadmin', 'admin_finance'));

// Rotas de Faturas
router.get('/invoices', financeController.listInvoices);
router.post('/invoices/generate-monthly', financeController.triggerMonthlyGeneration);
router.patch('/invoices/:id/pay', financeController.markAsPaid);

// Rotas Contábeis
router.get('/ledger/balance', financeController.getBalance);

module.exports = router;