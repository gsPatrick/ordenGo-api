const restaurantService = require('./restaurant.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError'); // <--- IMPORTAÇÃO QUE FALTAVA

// GET /settings
exports.getSettings = catchAsync(async (req, res, next) => {
  // req.restaurantId vem do middleware 'protect' ou do token da mesa
  const data = await restaurantService.getRestaurantSettings(req.restaurantId);

  res.status(200).json({
    status: 'success',
    data
  });
});

// PATCH /settings/appearance (Cores, Wifi, Sobre)
exports.updateAppearance = catchAsync(async (req, res, next) => {
  const data = { ...req.body };

  // Processar Uploads Múltiplos
  // req.files vem do 'upload.fields([...])' configurado na rota
  if (req.files) {
    // Função auxiliar para mapear arquivos para URLs
    const mapFiles = (files) => files.map(f => `/uploads/${f.filename}`);

    if (req.files.institutionalBanners) {
      data.institutionalBanners = mapFiles(req.files.institutionalBanners);
    }
    if (req.files.highlightImagesLarge) {
      // Pega apenas o primeiro se vier como array
      data.highlightImagesLarge = mapFiles(req.files.highlightImagesLarge);
    }
    if (req.files.highlightImagesSmall) {
      data.highlightImagesSmall = mapFiles(req.files.highlightImagesSmall);
    }
  }

  // Parse de JSONs vindos do FormData (Se o frontend enviar stringificado)
  ['publicTitle', 'aboutTitle', 'aboutText', 'ourHistory'].forEach(field => {
    if (data[field] && typeof data[field] === 'string') {
      try { data[field] = JSON.parse(data[field]); } catch(e) {}
    }
  });

  const config = await restaurantService.updateConfig(req.restaurantId, data);

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

// POST /settings/onboarding/complete
exports.finalizeOnboarding = catchAsync(async (req, res, next) => {
  await restaurantService.completeOnboarding(req.restaurantId);

  res.status(200).json({
    status: 'success',
    message: 'Onboarding concluído com sucesso!'
  });
});