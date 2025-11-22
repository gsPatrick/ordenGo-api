const express = require('express');
const superAdminController = require('./superAdmin.controller');
// --- IMPORTAÇÃO QUE FALTAVA ---
const systemAdsController = require('./systemAds.controller'); 
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload'); // Necessário para upload de imagens dos Ads

const router = express.Router();

// TODAS as rotas abaixo requerem Login E que o usuário seja 'superadmin'
router.use(protect);
router.use(restrictTo('superadmin'));

// --- ROTAS DE TENANTS (Restaurantes) ---
router.get('/tenants', superAdminController.listRestaurants);
router.post('/tenants', superAdminController.createRestaurant);
router.patch('/tenants/:id/toggle-status', superAdminController.toggleStatus);

// --- ROTAS DE ADS (System Ads) ---
router.get('/ads', systemAdsController.listAds);
router.post('/ads', upload.single('image'), systemAdsController.createAd);
router.delete('/ads/:id', systemAdsController.deleteAd);

module.exports = router;