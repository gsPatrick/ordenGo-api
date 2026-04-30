const campaignService = require('./campaign.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

exports.createCampaign = catchAsync(async (req, res, next) => {
  const campaign = await campaignService.createCampaign(req.body);
  
  res.status(201).json({
    status: 'success',
    message: 'Campanha criada. Agora adicione os criativos (banners).',
    data: { campaign }
  });
});

exports.uploadCreative = catchAsync(async (req, res, next) => {
  // O ID da campanha vem na URL (/campaigns/:id/creatives)
  const { id } = req.params;
  const { linkUrl } = req.body;

  if (!req.file) {
    return next(new AppError('Arquivo de mídia é obrigatório.', 400));
  }

  const creative = await campaignService.addCreativeToCampaign(id, req.file, linkUrl);

  res.status(201).json({
    status: 'success',
    data: { creative }
  });
});

exports.listCampaigns = catchAsync(async (req, res, next) => {
  const filters = {
    advertiserId: req.query.advertiserId,
    status: req.query.status,
    activeNow: req.query.activeNow === 'true'
  };

  const campaigns = await campaignService.listCampaigns(filters);

  res.status(200).json({
    status: 'success',
    results: campaigns.length,
    data: { campaigns }
  });
});

exports.updateStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body; // 'active', 'paused', 'finished'
  const campaign = await campaignService.toggleCampaignStatus(req.params.id, status);

  res.status(200).json({
    status: 'success',
    data: { campaign }
  });
});

exports.deleteCampaign = catchAsync(async (req, res, next) => {
  await campaignService.deleteCampaign(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});