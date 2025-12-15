const menuService = require('./menu.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

// Função auxiliar para mapear múltiplos arquivos
const mapFiles = (files) => {
  if (!files || files.length === 0) return [];
  return files.map(f => `/uploads/${f.filename}`);
};

// ... inside handlers (we'll do this in next step after reading the file)iar para parsear JSON vindo de FormData com segurança
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
  const includeUnavailable = req.query.includeUnavailable === 'true';
  const menu = await menuService.getFullMenu(req.restaurantId, includeUnavailable);
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


// Helper de validação de mídia
const validateMediaRules = (allMedia) => {
  let videoCount = 0;
  let gifCount = 0;

  allMedia.forEach(url => {
    if (url.endsWith('.mp4') || url.endsWith('.webm')) videoCount++;
    if (url.endsWith('.gif')) gifCount++;
  });

  if (videoCount > 1) throw new AppError('Apenas 1 vídeo é permitido por produto.', 400);
  if (gifCount > 1) throw new AppError('Apenas 1 GIF é permitido por produto.', 400);
  if (videoCount > 0 && gifCount > 0) throw new AppError('Não é permitido misturar Vídeo e GIF.', 400);
};

exports.createProduct = catchAsync(async (req, res, next) => {
  const data = { ...req.body };

  // 1. Parse de Campos Complexos (JSONB e Arrays)
  data.name = safeParse(data.name);
  data.description = safeParse(data.description);
  data.variants = safeParse(data.variants);
  data.modifierGroupIds = safeParse(data.modifierGroupIds);
  data.details = safeParse(data.details);

  // 2. Conversão de Flags
  if (data.isOffer !== undefined) data.isOffer = String(data.isOffer) === 'true';
  if (data.isHighlight !== undefined) data.isHighlight = String(data.isHighlight) === 'true';

  // 3. Upload de Imagem e Galeria
  // req.files vem de upload.fields([{name: 'image', maxCount: 1}, {name: 'gallery', maxCount: 10}])
  if (req.files) {
    if (req.files.image && req.files.image[0]) {
      data.imageUrl = `/uploads/${req.files.image[0].filename}`;
    }
    if (req.files.gallery) {
      data.gallery = mapFiles(req.files.gallery);
    }
  }

  // 4. Validação de Regras de Mídia
  const allMedia = [];
  if (data.imageUrl) allMedia.push(data.imageUrl);
  if (data.gallery && Array.isArray(data.gallery)) allMedia.push(...data.gallery);

  validateMediaRules(allMedia);

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

  // 3. Upload de Imagem e Galeria
  if (req.files) {
    if (req.files.image && req.files.image[0]) {
      data.imageUrl = `/uploads/${req.files.image[0].filename}`;
    }
    if (req.files.gallery) {
      // Se enviou nova galeria, substitui a atual? Ou faz append? 
      // IMPORTANTE: O front geralmente envia a galeria completa ou delta. 
      // Vamos assumir SUBSTITUIÇÃO se files forem enviados, ou merge se o front mandar existingGallery.
      // Simplificação: O backend apenas recebe novos arquivos aqui.
      // O service vai precisar lidar com "manter existentes".
      // Vamos passar os novos como 'newGalleryFiles'.
      data.newGalleryFiles = mapFiles(req.files.gallery);
    }
  }

  // Parse de existingGallery (imagens que o usuário optou por manter)
  if (data.existingGallery) {
    // existingGallery pode vir como string JSON ou array
    const existing = safeParse(data.existingGallery);
    data.gallery = Array.isArray(existing) ? existing : [];
  } else if (!req.files || !req.files.gallery) {
    // Se não enviou nem arquivos novos nem existingGallery, pode ser que usuario queira limpar?
    // Ou apenas editou nome. Vamos checar se o campo foi enviado.
    // Se existingGallery veio vazio, é um array vazio.
  }

  // Merge final para validação (Service fará o merge real, mas validamos input aqui)
  // Nota: A validação precisa saber o ESTADO FINAL.
  // Como o update é patch, precisamos buscar o produto atual SE não enviamos a galeria completa.
  // Para simplificar e evitar queries excessivas no controller, vamos delegar VIDEO check para o Service ou fazer aqui se tivermos todos os dados.
  // Assumindo que o Frontend envia 'existingGallery' contendo todas as URLs antigas que devem ficar.

  let finalGallery = data.gallery || []; // Do existing
  if (data.newGalleryFiles) {
    finalGallery = [...finalGallery, ...data.newGalleryFiles];
  }

  // Atualiza data.gallery para conter TUDO (existentes + novos) para salvar no banco
  if (data.existingGallery || data.newGalleryFiles) {
    data.gallery = finalGallery;
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

exports.updateModifierGroup = catchAsync(async (req, res, next) => {
  const data = { ...req.body };
  data.name = safeParse(data.name);
  if (data.options) data.options = safeParse(data.options);

  const group = await menuService.updateModifierGroup(req.restaurantId, req.params.id, data);
  res.status(200).json({ status: 'success', data: { group } });
});

exports.deleteModifierGroup = catchAsync(async (req, res, next) => {
  await menuService.deleteModifierGroup(req.restaurantId, req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  await menuService.deleteCategory(req.restaurantId, req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  await menuService.deleteProduct(req.restaurantId, req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

exports.reorderCategories = catchAsync(async (req, res, next) => {
  const { orderedIds } = req.body;
  await menuService.reorderCategories(req.restaurantId, orderedIds);
  res.status(200).json({ status: 'success', message: 'Categorias reordenadas.' });
});

exports.reorderProducts = catchAsync(async (req, res, next) => {
  const { orderedIds } = req.body;
  await menuService.reorderProducts(req.restaurantId, orderedIds);
  res.status(200).json({ status: 'success', message: 'Produtos reordenados.' });
});