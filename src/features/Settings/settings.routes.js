const express = require('express');
const settingsController = require('./settings.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const { logAction } = require('../../middlewares/auditMiddleware');

const router = express.Router();

router.use(protect);
// GARANTIA: Apenas superadmin e roles administrativas específicas
router.use(restrictTo('superadmin', 'admin_support')); 

// 1. Equipe
router.get('/team', settingsController.listTeam);
router.post('/team', logAction('CREATE_ADMIN_USER'), settingsController.createMember);
router.delete('/team/:id', logAction('DELETE_ADMIN_USER'), settingsController.deleteMember);

// 2. Logs
router.get('/audit-logs', settingsController.listLogs);

// 3. Integrações Globais
router.get('/integrations', settingsController.getGlobalIntegrations);
router.patch('/integrations', logAction('UPDATE_GLOBAL_INTEGRATIONS'), settingsController.updateGlobalIntegrations);

module.exports = router;