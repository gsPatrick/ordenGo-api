const { SystemAd } = require('../../models');
const catchAsync = require('../../utils/catchAsync');

exports.createAd = catchAsync(async (req, res, next) => {
  const data = { ...req.body };
  if (req.file) data.imageUrl = `/uploads/${req.file.filename}`;

  const ad = await SystemAd.create(data);
  res.status(201).json({ status: 'success', data: { ad } });
});

exports.listAds = catchAsync(async (req, res, next) => {
  const ads = await SystemAd.findAll({ order: [['createdAt', 'DESC']] });
  res.status(200).json({ status: 'success', data: { ads } });
});

exports.deleteAd = catchAsync(async (req, res, next) => {
  await SystemAd.destroy({ where: { id: req.params.id } });
  res.status(204).json({ status: 'success', data: null });
});