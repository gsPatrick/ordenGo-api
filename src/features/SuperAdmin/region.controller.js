const regionService = require('./region.service');
const catchAsync = require('../../utils/catchAsync');

// --- CRUD DE REGIÕES (DB Interno) ---

exports.createRegion = catchAsync(async (req, res, next) => {
  const region = await regionService.createRegion(req.body);
  
  res.status(201).json({
    status: 'success',
    data: { region }
  });
});

exports.listRegions = catchAsync(async (req, res, next) => {
  const regions = await regionService.listRegions();
  
  res.status(200).json({
    status: 'success',
    results: regions.length,
    data: { regions }
  });
});

exports.updateRegion = catchAsync(async (req, res, next) => {
  const region = await regionService.updateRegion(req.params.id, req.body);
  
  res.status(200).json({
    status: 'success',
    data: { region }
  });
});

exports.deleteRegion = catchAsync(async (req, res, next) => {
  await regionService.deleteRegion(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// --- PROXY DE CIDADES (API Externa) ---

exports.getCities = catchAsync(async (req, res, next) => {
  const { country } = req.params; // Vem da URL: /cities/ES
  
  const cities = await regionService.getCitiesForCountry(country);
  
  res.status(200).json({
    status: 'success',
    results: cities.length,
    data: { cities }
  });
});