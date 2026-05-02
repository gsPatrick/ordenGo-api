const sizeOf = require('image-size');
const { Campaign, AdCreative, Region, Advertiser, sequelize } = require('../../models');
const AppError = require('../../utils/AppError');
const { Op } = require('sequelize');

/**
 * Cria uma nova Campanha (Sem criativos ainda)
 */
exports.createCampaign = async (data) => {
  const { 
    advertiserId, 
    title, 
    startDate, 
    endDate, 
    priority, 
    frequency, 
    duration,
    targetRegionIds // Array de UUIDs de regiões
  } = data;

  // 1. Validar Anunciante
  const advertiser = await Advertiser.findByPk(advertiserId);
  if (!advertiser) throw new AppError('Anunciante inválido.', 400);

  const transaction = await sequelize.transaction();

  try {
    // 2. Criar Campanha
    const campaign = await Campaign.create({
      advertiserId,
      title,
      startDate,
      endDate,
      priority: priority || 'medium',
      frequency: frequency || 10, // Default: a cada 10 min
      duration: duration || 15,   // Default: 15 seg
      status: 'draft' // Começa como rascunho até ter criativos e ser ativada
    }, { transaction });

    // 3. Vincular Regiões (Segmentação Geográfica)
    if (targetRegionIds && targetRegionIds.length > 0) {
      await campaign.setRegions(targetRegionIds, { transaction });
    }

    await transaction.commit();
    return campaign;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};


/**
 * Adiciona um Criativo (Banner/Vídeo) a uma campanha existente
 */
exports.addCreativeToCampaign = async (campaignId, fileData, linkUrl) => {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign) throw new AppError('Campanha não encontrada.', 404);

  // 1. Validação de Aspect Ratio 16:9 para Imagens
  const type = fileData.mimetype.startsWith('video') ? 'video' : 'image';
  
  if (type === 'image') {
    try {
      const dimensions = sizeOf(fileData.path);
      const ratio = dimensions.width / dimensions.height;
      const targetRatio = 9 / 16; // MODO RETRATO (Portrait)
      const tolerance = 0.05; // 5% de tolerância

      if (Math.abs(ratio - targetRatio) > tolerance) {
        throw new AppError(`A imagem deve ter proporção 9:16 (Modo Retrato). Proporção enviada: ${ratio.toFixed(2)}`, 400);
      }
    } catch (err) {
      if (err.statusCode) throw err;
      // Se falhar ao ler dimensões, ignoramos ou lançamos erro
      console.error('Erro ao validar dimensões da imagem:', err);
    }
  }

  const mediaUrl = `/uploads/${fileData.filename}`;

  const creative = await AdCreative.create({
    campaignId,
    type,
    mediaUrl,
    linkUrl: linkUrl || null
  });
  
  return creative;
};

/**
 * Lista Campanhas com Filtros
 */
exports.listCampaigns = async (filters) => {
  const where = {};
  
  if (filters.advertiserId) where.advertiserId = filters.advertiserId;
  if (filters.status) where.status = filters.status;
  
  // Filtro por data (Ativas Hoje)
  if (filters.activeNow) {
    const now = new Date();
    where.startDate = { [Op.lte]: now };
    where.endDate = { [Op.gte]: now };
    where.status = 'active';
  }

  return await Campaign.findAll({
    where,
    include: [
      { 
        model: Advertiser, 
        attributes: ['companyName'] 
      },
      {
        model: Region,
        attributes: ['name', 'country'],
        through: { attributes: [] } // Não trazer dados da tabela pivô
      },
      {
        model: AdCreative,
        as: 'creatives' // Importante: usar o alias definido no index.js
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Atualiza Status (Ativar/Pausar)
 */
exports.toggleCampaignStatus = async (id, status) => {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) throw new AppError('Campanha não encontrada.', 404);

  // Validação: Não ativar campanha vencida
  if (status === 'active' && new Date(campaign.endDate) < new Date()) {
    throw new AppError('Não é possível ativar uma campanha que já venceu.', 400);
  }

  campaign.status = status;
  await campaign.save();
  return campaign;
};

/**
 * Remove Campanha e seus criativos
 */
exports.deleteCampaign = async (id) => {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) throw new AppError('Campanha não encontrada.', 404);
  
  // O CASCADE no banco cuidará dos criativos e associações
  await campaign.destroy();
};

