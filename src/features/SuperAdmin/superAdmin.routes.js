const express = require('express');
const superAdminController = require('./superAdmin.controller');
const systemAdsController = require('./systemAds.controller'); 
const regionRoutes = require('./region.routes'); // <--- Importação Nova
const planRoutes = require('../Plan/plan.routes'); // <--- NOVA IMPORTAÇÃO (Caminho relativo para a pasta Plan)
const advertiserRoutes = require('../AdNetwork/advertiser.routes'); // <--- NOVA IMPORTAÇÃO
const campaignRoutes = require('../AdNetwork/campaign.routes'); // <--- NOVA IMPORTAÇÃO
const financeRoutes = require('../Finance/finance.routes'); // <--- NOVA IMPORTAÇÃO
const analyticsRoutes = require('../Analytics/analytics.routes'); // <--- NOVA IMPORTAÇÃO
const settingsRoutes = require('../Settings/settings.routes'); // <--- NOVA IMPORTAÇÃO

const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

// Middleware de Proteção Global
router.use(protect);
router.use(restrictTo('superadmin'));

// 1. Sub-rotas de Geografia (Regiões e Cidades)
router.use('/regions', regionRoutes);


// 3. Rede de Publicidade (Ad Network) <--- NOVO BLOCO
router.use('/advertisers', advertiserRoutes);
router.use('/campaigns', campaignRoutes); // <--- NOVO BLOCO
// 4. Finanças e Contabilidade <--- NOVO BLOCO
router.use('/finance', financeRoutes);
 //Analytics e Relatórios <--- NOVO BLOCO
router.use('/analytics', analyticsRoutes);
// 6. Configurações e Auditoria <--- NOVO BLOCO
router.use('/settings', settingsRoutes);

// 2. Tenants (Restaurantes)
router.get('/tenants', superAdminController.listRestaurants);
router.post('/tenants', superAdminController.createRestaurant);
router.patch('/tenants/:id/toggle-status', superAdminController.toggleStatus);

// 3. Ads Legados (Se ainda estiver usando o systemAds antigo, manter por compatibilidade)
router.get('/ads', systemAdsController.listAds);
router.post('/ads', upload.single('image'), systemAdsController.createAd);
router.delete('/ads/:id', systemAdsController.deleteAd);
// 2. Gestão de Planos (SaaS Tiers) <--- NOVO
router.use('/plans', planRoutes);
router.post('/tenants/:id/impersonate', superAdminController.impersonateTenant);

module.exports = router;