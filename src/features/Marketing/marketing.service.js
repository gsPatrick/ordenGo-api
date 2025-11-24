const { Op } = require('sequelize');
const { Banner, SystemAd, Restaurant, Product, Promotion } = require('../../models'); // <--- ADICIONADO Promotion AQUI
const AppError = require('../../utils/AppError');

// ============================================================
// SCREENSAVERS (Banners & Ads)
// ============================================================

/**
 * Cria um Banner interno do Restaurante
 */
exports.createScreensaver = async (restaurantId, data) => {
  const imageUrl = `/uploads/${data.filename}`;
  
  // Parse se vier como string
  let title = data.title;
  let description = data.description;
  
  if (typeof title === 'string') {
    try { title = JSON.parse(title); } catch(e) { title = { pt: title }; }
  }
  if (typeof description === 'string') {
    try { description = JSON.parse(description); } catch(e) { description = { pt: description }; }
  }

  return await Banner.create({
    restaurantId,
    imageUrl,
    title, 
    description, 
    linkedProductId: data.linkedProductId || null, 
    order: data.order || 0,
    isActive: true
  });
};

/**
 * Busca Banners para o Tablet (Mistura Banners do Restaurante + Ads do Sistema)
 */
exports.getScreensavers = async (restaurantId, onlyActive = true) => {
  const where = { restaurantId };
  if (onlyActive) where.isActive = true;

  const internalBanners = await Banner.findAll({
    where,
    order: [['order', 'ASC'], ['createdAt', 'DESC']],
    include: [
        { 
            model: Product, 
            as: 'linkedProduct',
            attributes: ['id', 'name', 'price', 'imageUrl'] 
        }
    ]
  });

  // 2. Busca dados do Restaurante para saber a Região (Estado/UF)
  const restaurant = await Restaurant.findByPk(restaurantId, { attributes: ['addressState'] });
  
  let systemAds = [];

  // 3. Se o restaurante existir, busca Ads Globais ou daquela UF
  if (restaurant) {
    systemAds = await SystemAd.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { targetState: null }, // Global
          { targetState: restaurant.addressState } // Regional (ex: 'SP')
        ]
      },
      raw: true
    });

    // Opcional: Incrementar visualização dos Ads (Async)
    if (systemAds.length > 0) {
      const adIds = systemAds.map(ad => ad.id);
      SystemAd.increment('viewsCount', { where: { id: adIds } }).catch(err => {
        console.error('Erro ao incrementar views dos ads:', err);
      });
    }
  }

  // 4. Padroniza e mistura os arrays
  
  // Formata Banners Internos
  const formattedInternal = internalBanners.map(b => ({
    id: b.id,
    imageUrl: b.imageUrl,
    title: b.title, 
    description: b.description,
    linkedProduct: b.linkedProduct, 
    isAd: false,
    linkUrl: null
  }));

  // Formata Ads do Sistema (SuperAdmin)
  const formattedAds = systemAds.map(ad => ({
    id: ad.id,
    imageUrl: ad.imageUrl,
    title: { pt: ad.title }, 
    description: { pt: '' },
    isAd: true, 
    linkUrl: ad.linkUrl
  }));

  return [...formattedInternal, ...formattedAds];
};

/**
 * Deleta um Banner interno
 */
exports.deleteScreensaver = async (restaurantId, bannerId) => {
  const banner = await Banner.findOne({ where: { id: bannerId, restaurantId } });
  if (!banner) throw new AppError('Banner não encontrado', 404);
  await banner.destroy();
};

// ============================================================
// PROMOÇÕES
// ============================================================

/**
 * Cria uma Promoção
 */
exports.createPromotion = async (restaurantId, data) => {
  if (data.filename) {
    data.imageUrl = `/uploads/${data.filename}`;
  }
  
  // Parse manual se necessário
  if (typeof data.title === 'string') {
    try { data.title = JSON.parse(data.title); } catch(e) { data.title = { pt: data.title }; }
  }
  if (typeof data.activeDays === 'string') {
    try { data.activeDays = JSON.parse(data.activeDays); } catch(e) { data.activeDays = []; }
  }

  return await Promotion.create({ ...data, restaurantId });
};

/**
 * Lista Promoções Ativas do Restaurante
 */
exports.getPromotions = async (restaurantId) => {
  return await Promotion.findAll({
    where: { restaurantId, isActive: true }
  });
};

/**
 * Ativa/Desativa uma Promoção rapidamente
 */
exports.togglePromotion = async (restaurantId, promoId) => {
  const promo = await Promotion.findOne({ where: { id: promoId, restaurantId } });
  if (!promo) throw new AppError('Promoção não encontrada', 404);
  
  promo.isActive = !promo.isActive;
  await promo.save();
  return promo;
};