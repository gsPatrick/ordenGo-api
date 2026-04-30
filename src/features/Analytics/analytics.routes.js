const express = require('express');
const analyticsController = require('./analytics.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('superadmin', 'admin_finance', 'admin_sales'));

// Dashboard Global
router.get('/dashboard', analyticsController.getDashboard);

// Relatórios Específicos
router.get('/reports/ads', analyticsController.getAdsReport);
router.get('/reports/finance', analyticsController.getFinanceReport);

module.exports = router;
