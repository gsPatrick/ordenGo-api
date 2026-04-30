const impressionService = require('./impression.service');
const catchAsync = require('../../utils/catchAsync');

exports.trackView = catchAsync(async (req, res, next) => {
  // O tablet envia { campaignId, creativeId, restaurantId, tableId }
  await impressionService.registerImpression(req.body);

  // Resposta vazia e rápida (200 OK)
  res.status(200).send(); 
});

exports.trackClick = catchAsync(async (req, res, next) => {
  const { creativeId } = req.body;
  await impressionService.registerClick(creativeId);
  res.status(200).send();
});

