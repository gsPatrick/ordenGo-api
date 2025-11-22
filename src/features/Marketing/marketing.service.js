const { Op } = require('sequelize');
const { Banner, Promotion, SystemAd, Restaurant } = require('../../models');
const AppError = require('../../utils/AppError');

// ============================================================
// SCREENSAVERS (Banners & Ads)
// ============================================================

/**
 * Cria um Banner interno do Restaurante
 */
exports.createScreensaver = async (restaurantId, data) => {
  // data.filename vem do controller
  const imageUrl = `/uploads/${data.filename}`;
  
  return await Banner.create({
    restaurantId,
    imageUrl,
    title: data.title, // Opcional
    order: data.order || 0,
    isActive: true
  });
};

/**
 * Busca Banners para o Tablet (Mistura Banners do Restaurante + Ads do Sistema)
 */
exports.getScreensavers = async (restaurantId, onlyActive = true) => {
  // 1. Busca banners internos do restaurante
  const where = { restaurantId };
  if (onlyActive) where.isActive = true;

  const internalBanners = await Banner.findAll({
    where,
    order: [['order', 'ASC'], ['createdAt', 'DESC']],
    raw: true
  });

  // 2. Busca dados do Restaurante para saber a Região (Estado/UF)
  const restaurant = await Restaurant.findByPk(restaurantId, { attributes: ['addressState'] });
  
  let systemAds = [];

  // 3. Se o restaurante existir, busca Ads Globais ou daquela UF
  if (restaurant) {
    // Busca Ads que são Globais (targetState é NULL) OU da região do restaurante
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

    // Opcional: Incrementar visualização dos Ads (Async para não travar a resposta da API)
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
    title: b.title, // Pode ser objeto JSONB
    isAd: false, // Identificador para o frontend: É do restaurante
    linkUrl: b.actionLink
  }));

  // Formata Ads do Sistema (SuperAdmin)
  const formattedAds = systemAds.map(ad => ({
    id: ad.id,
    imageUrl: ad.imageUrl,
    title: { pt: ad.title }, // Padroniza como objeto JSONB para manter consistência com o i18n
    isAd: true, // Identificador para o frontend: É publicidade/Patrocinado
    linkUrl: ad.linkUrl
  }));

  // Retorna misturado. O frontend decide a lógica de exibição (ex: alternar 1 a 1, ou mostrar Ads a cada 3 banners)
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
  
  // O Controller já deve ter feito o JSON.parse de 'activeDays' e 'title' se vieram via form-data.
  // data.activeDays deve ser array [0,1,5...]

  return await Promotion.create({ ...data, restaurantId });
};

/**
 * Lista Promoções Ativas do Restaurante
 */
exports.getPromotions = async (restaurantId) => {
  // Retorna todas as ativas. O frontend deve validar se o horário atual (Client Time)
  // está dentro do range 'startTime' e 'endTime' e se o dia da semana bate com 'activeDays'.
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