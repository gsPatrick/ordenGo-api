const marketingService = require('./marketing.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

// --- SCREENSAVERS ---

exports.listScreensavers = catchAsync(async (req, res, next) => {
  // Se for público (Tablet), req.restaurantId deve ter sido injetado antes
  const banners = await marketingService.getScreensavers(req.restaurantId);
  res.status(200).json({ status: 'success', data: { banners } });
});

exports.createScreensaver = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Imagem é obrigatória', 400));
  
  const data = { ...req.body, filename: req.file.filename };
  
  // Parse dos JSONs vindos do FormData
  if (data.title && typeof data.title === 'string') data.title = JSON.parse(data.title);
  if (data.description && typeof data.description === 'string') data.description = JSON.parse(data.description);
  
  const banner = await marketingService.createScreensaver(req.restaurantId, data);

  res.status(201).json({ status: 'success', data: { banner } });
});

exports.deleteScreensaver = catchAsync(async (req, res, next) => {
  await marketingService.deleteScreensaver(req.restaurantId, req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

// --- PROMOÇÕES ---

exports.listPromotions = catchAsync(async (req, res, next) => {
  const promotions = await marketingService.getPromotions(req.restaurantId);
  res.status(200).json({ status: 'success', data: { promotions } });
});

exports.createPromotion = catchAsync(async (req, res, next) => {
  const data = { ...req.body };
  
  // Parse de campos complexos vindos do FormData
  if (data.title && typeof data.title === 'string') data.title = JSON.parse(data.title);
  if (data.activeDays && typeof data.activeDays === 'string') data.activeDays = JSON.parse(data.activeDays);
  
  if (req.file) data.filename = req.file.filename;

  const promotion = await marketingService.createPromotion(req.restaurantId, data);
  res.status(201).json({ status: 'success', data: { promotion } });
});

exports.togglePromotion = catchAsync(async (req, res, next) => {
  const promotion = await marketingService.togglePromotion(req.restaurantId, req.params.id);
  res.status(200).json({ status: 'success', data: { isActive: promotion.isActive } });
});