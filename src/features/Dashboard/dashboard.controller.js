const dashboardService = require('./dashboard.service');
const catchAsync = require('../../utils/catchAsync');

// --- Para o Gerente do Restaurante ---
exports.getManagerDashboard = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // req.restaurantId vem do middleware 'protect'
  const data = await dashboardService.getRestaurantStats(req.restaurantId, startDate, endDate);

  res.status(200).json({
    status: 'success',
    data
  });
});

// --- Para o Dono do SaaS ---
exports.getSuperAdminDashboard = catchAsync(async (req, res, next) => {
  const data = await dashboardService.getSaaSStats();

  res.status(200).json({
    status: 'success',
    data
  });
});