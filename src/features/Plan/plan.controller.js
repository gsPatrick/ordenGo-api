const planService = require('./plan.service');
const catchAsync = require('../../utils/catchAsync');

exports.createPlan = catchAsync(async (req, res, next) => {
  const plan = await planService.createPlan(req.body);
  
  res.status(201).json({
    status: 'success',
    data: { plan }
  });
});

exports.listPlans = catchAsync(async (req, res, next) => {
  // Se passar ?active=true na URL, filtra apenas os ativos (útil para dropdowns)
  const onlyActive = req.query.active === 'true';
  const plans = await planService.getAllPlans(onlyActive);
  
  res.status(200).json({
    status: 'success',
    results: plans.length,
    data: { plans }
  });
});

exports.getPlan = catchAsync(async (req, res, next) => {
  const plan = await planService.getPlanById(req.params.id);
  // Opcional: Incluir contagem de uso
  const usageCount = await planService.countUsage(plan.id);
  
  res.status(200).json({
    status: 'success',
    data: { 
      plan,
      usageCount
    }
  });
});

exports.updatePlan = catchAsync(async (req, res, next) => {
  const plan = await planService.updatePlan(req.params.id, req.body);
  
  res.status(200).json({
    status: 'success',
    data: { plan }
  });
});

exports.toggleStatus = catchAsync(async (req, res, next) => {
  const plan = await planService.togglePlanStatus(req.params.id);
  
  res.status(200).json({
    status: 'success',
    message: `Plano ${plan.isActive ? 'ativado' : 'desativado'} com sucesso.`,
    data: { plan }
  });
});