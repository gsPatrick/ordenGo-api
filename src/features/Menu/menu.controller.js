const menuService = require('./menu.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

// Função auxiliar para parsear JSON vindo de FormData com segurança
const safeParse = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value; // Se não der para parsear, retorna como string mesmo (ou undefined)
    }
  }
  return value;
};

// ============================================================
// LEITURA (Árvore do Menu)
// ============================================================
exports.getMenu = catchAsync(async (req, res, next) => {
  // Se for acesso público (Tablet), o restaurantId pode vir injetado manualmente no req
  // Se for acesso logado, vem do token
  const menu = await menuService.getFullMenu(req.restaurantId);
  res.status(200).json({ status: 'success', data: { menu } });
});

// ============================================================
// CATEGORIAS
// ============================================================
exports.createCategory = catchAsync(async (req, res, next) => {
  const data = { ...req.body };

  // 1. Processar Uploads (Fields: 'image' e 'banners')
  // O middleware na rota é upload.fields(...)
  if (req.files) {
    // Imagem Principal (Ícone)
    if (req.files.image && req.files.image[0]) {
      data.image = `/uploads/${req.files.image[0].filename}`;
    }
    // Banners Promocionais (Array)
    if (req.files.banners) {
      data.banners = req.files.banners.map(f => `/uploads/${f.filename}`);
    }
  }

  // 2. Parse do Nome (i18n)
  // Ex: '{"pt": "Bebidas"}' -> { pt: "Bebidas" }
  data.name = safeParse(data.name);

  const category = await menuService.createCategory(req.restaurantId, data);
  res.status(201).json({ status: 'success', data: { category } });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const data = { ...req.body };

  // 1. Processar Uploads
  if (req.files) {
    if (req.files.image && req.files.image[0]) {
      data.image = `/uploads/${req.files.image[0].filename}`;
    }
    if (req.files.banners) {
      // Se enviou novos banners, substitui os antigos (ou lógica de append, aqui substitui)
      data.banners = req.files.banners.map(f => `/uploads/${f.filename}`);
    }
  }

  // 2. Parse do Nome
  if (data.name) data.name = safeParse(data.name);

  const category = await menuService.updateCategory(req.restaurantId, req.params.id, data);
  res.status(200).json({ status: 'success', data: { category } });
});

// ============================================================
// PRODUTOS
// ============================================================

// Novo: Listar produtos com filtros (Ofertas / Destaques)
exports.listProducts = catchAsync(async (req, res, next) => {
  const filters = {
    isOffer: req.query.isOffer === 'true',
    isHighlight: req.query.isHighlight === 'true'
  };

  const products = await menuService.getProducts(req.restaurantId, filters);
  
  res.status(200).json({ status: 'success', results: products.length, data: { products } });
});

exports.createProduct = catchAsync(async (req, res, next) => {
  const data = { ...req.body };

  // 1. Parse de Campos Complexos (JSONB e Arrays)
  data.name = safeParse(data.name);
  data.description = safeParse(data.description);
  data.variants = safeParse(data.variants); // Array de variantes
  data.modifierGroupIds = safeParse(data.modifierGroupIds); // Array de IDs
  data.details = safeParse(data.details); // Objeto de detalhes

  // 2. Conversão de Flags (FormData envia "true"/"false" como string)
  if (data.isOffer !== undefined) data.isOffer = String(data.isOffer) === 'true';
  if (data.isHighlight !== undefined) data.isHighlight = String(data.isHighlight) === 'true';

  // 3. Upload de Imagem (Single)
  if (req.file) {
    data.imageUrl = `/uploads/${req.file.filename}`;
  }

  const product = await menuService.createProduct(req.restaurantId, data);
  res.status(201).json({ status: 'success', data: { product } });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const data = { ...req.body };

  // 1. Parse de Campos Complexos
  if (data.name) data.name = safeParse(data.name);
  if (data.description) data.description = safeParse(data.description);
  if (data.variants) data.variants = safeParse(data.variants);
  if (data.modifierGroupIds) data.modifierGroupIds = safeParse(data.modifierGroupIds);
  if (data.details) data.details = safeParse(data.details);

  // 2. Conversão de Flags
  if (data.isOffer !== undefined) data.isOffer = String(data.isOffer) === 'true';
  if (data.isHighlight !== undefined) data.isHighlight = String(data.isHighlight) === 'true';

  // 3. Upload de Imagem
  if (req.file) {
    data.imageUrl = `/uploads/${req.file.filename}`;
  }

  const product = await menuService.updateProduct(req.restaurantId, req.params.id, data);
  res.status(200).json({ status: 'success', data: { product } });
});

// "86 it" (Pausa rápida)
exports.toggleAvailability = catchAsync(async (req, res, next) => {
  const product = await menuService.toggleProductAvailability(req.restaurantId, req.params.id);
  res.status(200).json({ status: 'success', data: { isAvailable: product.isAvailable } });
});

// ============================================================
// MODIFICADORES
// ============================================================
exports.createModifierGroup = catchAsync(async (req, res, next) => {
  const data = { ...req.body };
  
  // Parse do nome (i18n) e das opções
  data.name = safeParse(data.name);
  if (data.options) data.options = safeParse(data.options);

  const group = await menuService.createModifierGroup(req.restaurantId, data);
  res.status(201).json({ status: 'success', data: { group } });
});

exports.listModifiers = catchAsync(async (req, res, next) => {
  const groups = await menuService.getAllModifierGroups(req.restaurantId);
  res.status(200).json({ status: 'success', data: { groups } });
});