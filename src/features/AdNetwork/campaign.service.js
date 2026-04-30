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

  // Define tipo baseado na extensão ou mimetype
  const type = fileData.mimetype.startsWith('video') ? 'video' : 'image';
  const mediaUrl = `/uploads/${fileData.filename}`;

  const creative = await AdCreative.create({
    campaignId,
    type,
    mediaUrl,
    linkUrl: linkUrl || null
  });

  // Se a campanha estava em 'draft', podemos passar para 'active' automaticamente ou manter manual
  // Por segurança, vamos manter manual ou deixar o admin decidir.
  
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

