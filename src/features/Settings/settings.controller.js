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