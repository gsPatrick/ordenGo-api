const express = require('express');
const financeController = require('./finance.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

// --- Rotas de CAJA (Acessíveis por Restaurant Admin e SuperAdmin) ---
// Note: O middleware restrito é aplicado individualmente para segurança
router.get('/cash-reports/active', financeController.getActiveSession);
router.post('/cash-reports/open', restrictTo('admin', 'manager'), financeController.openSession);
router.post('/cash-reports/withdrawal', restrictTo('admin', 'manager'), financeController.addWithdrawal);
router.post('/cash-reports/close', restrictTo('admin', 'manager'), financeController.closeSession);
router.get('/cash-reports', restrictTo('admin', 'manager', 'superadmin'), financeController.listCashReports);
router.get('/cash-reports/:id', restrictTo('admin', 'manager', 'superadmin'), financeController.getCashReportDetails);

// --- Rotas de Faturas & Ledger (Apenas SuperAdmin e Admin Financeiro SaaS) ---
router.get('/invoices', restrictTo('superadmin', 'admin_finance'), financeController.listInvoices);
router.post('/invoices/generate-monthly', restrictTo('superadmin'), financeController.triggerMonthlyGeneration);
router.patch('/invoices/:id/pay', restrictTo('superadmin'), financeController.markAsPaid);
router.get('/ledger/balance', restrictTo('superadmin'), financeController.getBalance);

module.exports = router;