const express = require('express');
const superAdminController = require('./superAdmin.controller');
const systemAdsController = require('./systemAds.controller');
const regionRoutes = require('./region.routes');
const planRoutes = require('../Plan/plan.routes');
const advertiserRoutes = require('../AdNetwork/advertiser.routes');
const campaignRoutes = require('../AdNetwork/campaign.routes');
const financeRoutes = require('../Finance/finance.routes');
const analyticsRoutes = require('../Analytics/analytics.routes');
const settingsRoutes = require('../Settings/settings.routes');

const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

// Middleware de Proteção Global
router.use(protect);
router.use(restrictTo('superadmin'));

// 1. Sub-rotas de Geografia (Regiões e Cidades)
router.use('/regions', regionRoutes);

// 2. Tenants (Restaurantes)
router.get('/tenants', superAdminController.listRestaurants);
router.post('/tenants', superAdminController.createRestaurant);
router.get('/tenants/:id', superAdminController.getRestaurant);
router.put('/tenants/:id', superAdminController.updateRestaurant);
router.delete('/tenants/:id', superAdminController.deleteRestaurant);
router.patch('/tenants/:id/toggle-status', superAdminController.toggleStatus);

// Documentos
router.get('/tenants/:id/documents', superAdminController.listDocuments);
router.post('/tenants/:id/documents', upload.single('file'), superAdminController.uploadDocument);
router.put('/tenants/:id/documents/:docId', superAdminController.updateDocument);
router.patch('/tenants/:id/documents/:docId/pay', superAdminController.payDocument);
router.delete('/tenants/:id/documents/:docId', superAdminController.deleteDocument);

// Notas
router.get('/tenants/:id/notes', superAdminController.listNotes);
router.post('/tenants/:id/notes', superAdminController.createNote);
router.delete('/tenants/:id/notes/:noteId', superAdminController.deleteNote);

// Impersonate
router.post('/tenants/:id/impersonate', superAdminController.impersonateTenant);

// 3. Rede de Publicidade (Ad Network)
router.use('/advertisers', advertiserRoutes);
router.use('/campaigns', campaignRoutes);

// 4. Finanças e Contabilidade
router.use('/finance', financeRoutes);

// 5. Analytics e Relatórios
router.use('/analytics', analyticsRoutes);

// 6. Configurações e Auditoria
router.use('/settings', settingsRoutes);

// 7. Gestão de Planos (SaaS Tiers)
router.use('/plans', planRoutes);

// 8. Ads Legados (Compatibilidade)
router.get('/ads', systemAdsController.listAds);
router.post('/ads', upload.single('image'), systemAdsController.createAd);
router.delete('/ads/:id', systemAdsController.deleteAd);

module.exports = router;