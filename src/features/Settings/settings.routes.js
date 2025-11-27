// src/features/Settings/settings.routes.js

const express = require('express');
const settingsController = require('./settings.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const { logAction } = require('../../middlewares/auditMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('superadmin'));

// 1. Equipe
router.get('/team', settingsController.listTeam);
router.post('/team', logAction('CREATE_ADMIN_USER'), settingsController.createMember);
router.delete('/team/:id', logAction('DELETE_ADMIN_USER'), settingsController.deleteMember);

// 2. Logs
router.get('/audit-logs', settingsController.listLogs);

// 3. Integrações Globais (CRUD Real)
router.get('/integrations', settingsController.getGlobalIntegrations); // Carregar configs
router.patch('/integrations', logAction('UPDATE_GLOBAL_INTEGRATIONS'), settingsController.updateGlobalIntegrations); // Salvar

module.exports = router;