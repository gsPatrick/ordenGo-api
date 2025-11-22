const restaurantService = require('./restaurant.service');
const catchAsync = require('../../utils/catchAsync');

// GET /settings
exports.getSettings = catchAsync(async (req, res, next) => {
  // req.restaurantId vem do middleware 'protect'
  const data = await restaurantService.getRestaurantSettings(req.restaurantId);

  res.status(200).json({
    status: 'success',
    data
  });
});

// PATCH /settings/appearance (Cores, Wifi, Sobre)
exports.updateAppearance = catchAsync(async (req, res, next) => {
  const config = await restaurantService.updateConfig(req.restaurantId, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Configurações visuais atualizadas.',
    data: { config }
  });
});

// PATCH /settings/general (Nome, Moeda, Idiomas)
exports.updateGeneral = catchAsync(async (req, res, next) => {
  const restaurant = await restaurantService.updateGeneralInfo(req.restaurantId, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Informações gerais atualizadas.',
    data: { restaurant }
  });
});

// POST /settings/logo
exports.uploadLogo = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Nenhum arquivo enviado.', 400));
  }

  const logoUrl = await restaurantService.updateLogo(req.restaurantId, req.file.filename);

  res.status(200).json({
    status: 'success',
    message: 'Logotipo atualizado com sucesso.',
    data: { logoUrl }
  });
});