const { EmailTemplate } = require('../../models');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

exports.getAllTemplates = catchAsync(async (req, res) => {
  const templates = await EmailTemplate.findAll();
  res.status(200).json({ status: 'success', data: { templates } });
});

exports.getTemplate = catchAsync(async (req, res) => {
  const template = await EmailTemplate.findByPk(req.params.id);
  if (!template) throw new AppError('Template não encontrado', 404);
  res.status(200).json({ status: 'success', data: { template } });
});

exports.createTemplate = catchAsync(async (req, res) => {
  const template = await EmailTemplate.create(req.body);
  res.status(201).json({ status: 'success', data: { template } });
});

exports.updateTemplate = catchAsync(async (req, res) => {
  const template = await EmailTemplate.findByPk(req.params.id);
  if (!template) throw new AppError('Template não encontrado', 404);
  
  await template.update(req.body);
  res.status(200).json({ status: 'success', data: { template } });
});

exports.deleteTemplate = catchAsync(async (req, res) => {
  const template = await EmailTemplate.findByPk(req.params.id);
  if (!template) throw new AppError('Template não encontrado', 404);
  
  await template.destroy();
  res.status(204).json({ status: 'success', data: null });
});
