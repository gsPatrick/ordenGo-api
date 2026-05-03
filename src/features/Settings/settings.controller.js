// src/features/Settings/settings.controller.js

const teamService = require('./team.service');
const auditService = require('./audit.service');
const systemService = require('./system.service'); // <--- Service Real
const catchAsync = require('../../utils/catchAsync');

// --- EQUIPE INTERNA (Real) ---

exports.listTeam = catchAsync(async (req, res, next) => {
  const team = await teamService.listInternalTeam();
  res.status(200).json({ status: 'success', results: team.length, data: { team } });
});

exports.createMember = catchAsync(async (req, res, next) => {
  const user = await teamService.createInternalUser(req.body);
  res.status(201).json({ status: 'success', data: { user } });
});

exports.deleteMember = catchAsync(async (req, res, next) => {
  await teamService.removeInternalUser(req.params.id, req.user.id);
  res.status(204).json({ status: 'success', data: null });
});

// --- AUDITORIA (Real) ---

exports.listLogs = catchAsync(async (req, res, next) => {
  const logs = await auditService.getLogs();
  res.status(200).json({ status: 'success', results: logs.length, data: { logs } });
});

// --- INTEGRAÇÕES GLOBAIS (AGORA REAL - SEM SIMULAÇÃO) ---

exports.getGlobalIntegrations = catchAsync(async (req, res, next) => {
  const settings = await systemService.getAllSettings(false); // false = mascarar segredos
  res.status(200).json({
    status: 'success',
    data: settings
  });
});

exports.updateGlobalIntegrations = catchAsync(async (req, res, next) => {
  // O body contém { stripe_secret_key: "...", smtp_host: "..." }
  const updatedSettings = await systemService.updateSettings(req.body);
  
  res.status(200).json({
    status: 'success',
    message: 'Configurações globais salvas no banco de dados.',
    data: updatedSettings
  });
});
exports.getSettings = catchAsync(async (req, res, next) => {
  const { group } = req.query;
  const settings = await systemService.getSettingsByGroup(group || 'general');
  res.status(200).json({ status: 'success', data: { settings } });
});

exports.updateSettingsBatch = catchAsync(async (req, res, next) => {
  const { settings } = req.body;
  await systemService.updateSettingsBatch(settings);
  res.status(200).json({ status: 'success', message: 'Configurações atualizadas em lote.' });
});

exports.uploadAsset = catchAsync(async (req, res, next) => {
  const AppError = require('../../utils/AppError');
  if (!req.file) throw new AppError('Nenhum arquivo enviado.', 400);
  const url = `/uploads/${req.file.filename}`;
  res.status(200).json({ status: 'success', data: { url } });
});
