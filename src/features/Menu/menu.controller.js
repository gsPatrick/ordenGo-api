const menuService = require('./menu.service');
const catchAsync = require('../../utils/catchAsync');

// --- LEITURA ---
exports.getMenu = catchAsync(async (req, res, next) => {
  // Pode ser acessado publicamente (se tiver token da mesa) ou pelo admin
  // Se for público, precisamos descobrir o restaurantId via Token ou Params. 
  // Vamos assumir aqui que quem chama essa rota já passou por algum middleware que setou req.restaurantId
  
  const menu = await menuService.getFullMenu(req.restaurantId);
  res.status(200).json({ status: 'success', data: { menu } });
});

// --- CATEGORIAS ---
exports.createCategory = catchAsync(async (req, res, next) => {
  const data = { ...req.body };
  if (req.file) data.filename = req.file.filename;

  const category = await menuService.createCategory(req.restaurantId, data);
  res.status(201).json({ status: 'success', data: { category } });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const data = { ...req.body };
  if (req.file) data.filename = req.file.filename;

  const category = await menuService.updateCategory(req.restaurantId, req.params.id, data);
  res.status(200).json({ status: 'success', data: { category } });
});

// --- PRODUTOS ---
exports.createProduct = catchAsync(async (req, res, next) => {
  const data = { ...req.body };
  // O multer envia form-data. Se vier JSON complexo (ex: variants) dentro do form-data, 
  // o frontend precisa enviar como string JSON e aqui fazemos parse.
  if (data.variants && typeof data.variants === 'string') data.variants = JSON.parse(data.variants);
  if (data.modifierGroupIds && typeof data.modifierGroupIds === 'string') data.modifierGroupIds = JSON.parse(data.modifierGroupIds);
  if (data.name && typeof data.name === 'string') data.name = JSON.parse(data.name);
  if (req.file) data.filename = req.file.filename;

  const product = await menuService.createProduct(req.restaurantId, data);
  res.status(201).json({ status: 'success', data: { product } });
});

exports.toggleAvailability = catchAsync(async (req, res, next) => {
  const product = await menuService.toggleProductAvailability(req.restaurantId, req.params.id);
  res.status(200).json({ status: 'success', data: { isAvailable: product.isAvailable } });
});

// --- MODIFICADORES ---
exports.createModifierGroup = catchAsync(async (req, res, next) => {
  const group = await menuService.createModifierGroup(req.restaurantId, req.body);
  res.status(201).json({ status: 'success', data: { group } });
});

exports.listModifiers = catchAsync(async (req, res, next) => {
  const groups = await menuService.getAllModifierGroups(req.restaurantId);
  res.status(200).json({ status: 'success', data: { groups } });
});