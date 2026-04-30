const express = require('express');
const marketingController = require('./marketing.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');
const impressionController = require('../AdNetwork/impression.controller'); // <--- NOVO CONTROLLER

const router = express.Router();

// ============================================================
// ROTAS PÚBLICAS (Tablet)
// ============================================================

// 1. Buscar Screensavers (Internos + Ads)
router.get('/public/:restaurantId/screensavers', (req, res, next) => {
  req.restaurantId = req.params.restaurantId;
  next();
}, marketingController.listScreensavers);

// 2. Buscar Promoções
router.get('/public/:restaurantId/promotions', (req, res, next) => {
    req.restaurantId = req.params.restaurantId;
    next();
}, marketingController.listPromotions);

// 3. TRACKING DE ADS (Novo Endpoint)
// O tablet chama isso toda vez que um banner de "type: ad" aparece
router.post('/public/track/view', impressionController.trackView);
router.post('/public/track/click', impressionController.trackClick);


// ============================================================
// ROTAS PROTEGIDAS (Gerente)
// ============================================================
router.use(protect);
router.use(restrictTo('manager', 'admin', 'superadmin'));

// Screensavers Internos
router.post('/screensavers', upload.single('image'), marketingController.createScreensaver);
router.delete('/screensavers/:id', marketingController.deleteScreensaver);
router.get('/screensavers', marketingController.listScreensavers);

// Promoções
router.get('/promotions', marketingController.listPromotions);
router.post('/promotions', upload.single('image'), marketingController.createPromotion);
router.patch('/promotions/:id/toggle', marketingController.togglePromotion);

module.exports = router;