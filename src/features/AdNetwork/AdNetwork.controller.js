const advertiserService = require('./advertiser.service');
const catchAsync = require('../../utils/catchAsync');

exports.create = catchAsync(async (req, res, next) => {
  const advertiser = await advertiserService.createAdvertiser(req.body);
  
  res.status(201).json({
    status: 'success',
    data: { advertiser }
  });
});

exports.list = catchAsync(async (req, res, next) => {
  // Filtro opcional ?status=active
  const status = req.query.status;
  const advertisers = await advertiserService.getAllAdvertisers(status);
  
  res.status(200).json({
    status: 'success',
    results: advertisers.length,
    data: { advertisers }
  });
});

exports.getOne = catchAsync(async (req, res, next) => {
  const advertiser = await advertiserService.getAdvertiserById(req.params.id);
  
  res.status(200).json({
    status: 'success',
    data: { advertiser }
  });
});

exports.update = catchAsync(async (req, res, next) => {
  const advertiser = await advertiserService.updateAdvertiser(req.params.id, req.body);
  
  res.status(200).json({
    status: 'success',
    data: { advertiser }
  });
});

exports.delete = catchAsync(async (req, res, next) => {
  await advertiserService.deleteAdvertiser(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});
