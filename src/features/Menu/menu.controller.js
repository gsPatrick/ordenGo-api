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

  // 1. Validação Crítica: CategoryId não pode ser vazio
  if (!data.categoryId || data.categoryId === "") {
    return next(new AppError('A Categoria é obrigatória. Por favor, selecione uma.', 400));
  }

  // 2. Parse de JSONs vindos do FormData (Multipart envia tudo como string)
  try {
    if (typeof data.name === 'string') data.name = JSON.parse(data.name);
    if (typeof data.description === 'string') data.description = JSON.parse(data.description);
    if (typeof data.details === 'string') data.details = JSON.parse(data.details);
    if (data.variants && typeof data.variants === 'string') data.variants = JSON.parse(data.variants);
    if (data.modifierGroupIds && typeof data.modifierGroupIds === 'string') {
      data.modifierGroupIds = JSON.parse(data.modifierGroupIds);
    }
  } catch (err) {
    return next(new AppError('Erro ao processar dados do formulário (JSON inválido).', 400));
  }

  // 3. Imagem
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