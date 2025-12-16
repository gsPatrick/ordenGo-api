const { Op } = require('sequelize');
const {
  Banner,
  Product,
  Promotion,
  Campaign,
  AdCreative,
  Region,
  Advertiser,
  Restaurant
} = require('../../models');

// ============================================================
// SCREENSAVERS (Entrega de Ads + Banners Internos)
// ============================================================

/**
 * Cria um Banner interno do Restaurante
 */
exports.createScreensaver = async (restaurantId, data) => {
  const imageUrl = `/uploads/${data.filename}`;

  let title = data.title;
  let description = data.description;

  if (typeof title === 'string') {
    try { title = JSON.parse(title); } catch (e) { title = { pt: title }; }
  }
  if (typeof description === 'string') {
    try { description = JSON.parse(description); } catch (e) { description = { pt: description }; }
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
 * Busca Mix de Banners para o Tablet:
 * 1. Banners Internos (Promoções do próprio restaurante)
 * 2. Campanhas Publicitárias (Ad Network) filtradas por Região
 */
exports.getScreensavers = async (restaurantId) => {
  // 1. Buscar Banners Internos
  const internalBanners = await Banner.findAll({
    where: { restaurantId, isActive: true },
    order: [['order', 'ASC'], ['createdAt', 'DESC']],
    include: [{ model: Product, as: 'linkedProduct', attributes: ['id', 'name', 'price', 'imageUrl'] }]
  });

  // 2. Identificar Região do Restaurante
  const restaurant = await Restaurant.findByPk(restaurantId, { attributes: ['regionId'] });

  let adCreatives = [];

  // 3. Buscar Campanhas Ativas
  // Regra: Status 'active', Dentro do prazo, e (Global OU Na Região do Restaurante)
  if (restaurant) {
    const now = new Date();

    const activeCampaigns = await Campaign.findAll({
      where: {
        status: 'active',
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      },
      include: [
        {
          model: Region,
          attributes: ['id'],
          through: { attributes: [] }, // Tabela pivô
          required: false // Left Join (permite campanhas sem região = Globais?)
          // OBS: Se quiser forçar que campanhas globais não tenham região, a lógica muda.
          // Aqui assumimos: Se a campanha tem regiões, o restaurante tem que estar em uma delas.
          // Se a campanha não tem regiões, ela é global.
        },
        {
          model: AdCreative,
          as: 'creatives'
        }
      ]
    });

    // Filtragem de Região em Memória (mais seguro para lógica Global vs Regional)
    activeCampaigns.forEach(campaign => {
      const campaignRegions = campaign.Regions.map(r => r.id);
      const isGlobal = campaignRegions.length === 0;
      const matchesRegion = restaurant.regionId && campaignRegions.includes(restaurant.regionId);

      if (isGlobal || matchesRegion) {
        // Adiciona os criativos dessa campanha à lista
        campaign.creatives.forEach(creative => {
          adCreatives.push({
            ...creative.toJSON(),
            campaignId: campaign.id,
            priority: campaign.priority,
            duration: campaign.duration
          });
        });
      }
    });
  }

  // 4. Formatação Unificada
  const formattedInternal = internalBanners.map(b => ({
    type: 'internal',
    id: b.id,
    imageUrl: b.imageUrl,
    title: b.title,
    description: b.description,
    linkedProduct: b.linkedProduct,
    duration: 10, // Duração padrão interno
    campaignId: null,
    creativeId: null
  }));

  const formattedAds = adCreatives.map(ad => ({
    type: 'ad',
    id: ad.id, // Creative ID
    imageUrl: ad.mediaUrl,
    title: { pt: '' }, // Ads geralmente já tem texto na imagem
    description: { pt: '' },
    linkUrl: ad.linkUrl,
    duration: ad.duration || 15,
    campaignId: ad.campaignId, // CRÍTICO PARA TRACKING
    creativeId: ad.id          // CRÍTICO PARA TRACKING
  }));

  // Misturar ou priorizar Ads? 
  // Por enquanto, retornamos tudo junto. O Frontend faz o "Shuffle" ou "Round Robin".
  return [...formattedInternal, ...formattedAds];
};

exports.deleteScreensaver = async (restaurantId, bannerId) => {
  const banner = await Banner.findOne({ where: { id: bannerId, restaurantId } });
  if (!banner) throw new AppError('Banner não encontrado', 404);
  await banner.destroy();
};

// ============================================================
// PROMOÇÕES (Mantido igual)
// ============================================================

exports.createPromotion = async (restaurantId, data) => {
  if (data.filename) data.imageUrl = `/uploads/${data.filename}`;

  if (typeof data.title === 'string') {
    try { data.title = JSON.parse(data.title); } catch (e) { data.title = { pt: data.title }; }
  }
  if (typeof data.activeDays === 'string') {
    try { data.activeDays = JSON.parse(data.activeDays); } catch (e) { data.activeDays = []; }
  }

  return await Promotion.create({ ...data, restaurantId });
};

exports.getPromotions = async (restaurantId) => {
  return await Promotion.findAll({ where: { restaurantId, isActive: true } });
};

exports.togglePromotion = async (restaurantId, promoId) => {
  const promo = await Promotion.findOne({ where: { id: promoId, restaurantId } });
  if (!promo) throw new AppError('Promoção não encontrada', 404);

  promo.isActive = !promo.isActive;
  await promo.save();
  return promo;
};