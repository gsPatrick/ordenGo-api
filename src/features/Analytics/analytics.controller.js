const analyticsService = require('./analytics.service');
const catchAsync = require('../../utils/catchAsync');

// Dashboard Principal (Widgets)
exports.getDashboard = catchAsync(async (req, res, next) => {
  const stats = await analyticsService.getGlobalDashboardStats();
  
  res.status(200).json({
    status: 'success',
    data: stats
  });
});

// Relatório de Ads
exports.getAdsReport = catchAsync(async (req, res, next) => {
  const report = await analyticsService.getAdPerformanceReport();
  
  res.status(200).json({
    status: 'success',
    data: { report }
  });
});

// Relatório Financeiro (Inadimplência)
exports.getFinanceReport = catchAsync(async (req, res, next) => {
  const report = await analyticsService.getOverdueReport();
  
  res.status(200).json({
    status: 'success',
    data: { report }
  });
});