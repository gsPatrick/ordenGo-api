const express = require('express');
const marketingController = require('./marketing.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

// ============================================================
// ROTAS PÚBLICAS (Tablet) - SEM LOGIN NECESSÁRIO
// ============================================================
// IMPORTANTE: Estas devem vir ANTES do router.use(protect)

router.get('/public/:restaurantId/screensavers', (req, res, next) => {
  req.restaurantId = req.params.restaurantId;
  next();
}, marketingController.listScreensavers);

router.get('/public/:restaurantId/promotions', (req, res, next) => {
    req.restaurantId = req.params.restaurantId;
    next();
}, marketingController.listPromotions);


// ============================================================
// ROTAS PROTEGIDAS (Gerente) - LOGIN NECESSÁRIO
// ============================================================
router.use(protect); // <--- Bloqueia tudo daqui para baixo
router.use(restrictTo('manager', 'admin'));

// Screensavers (Gestão)
router.post('/screensavers', upload.single('image'), marketingController.createScreensaver);
router.delete('/screensavers/:id', marketingController.deleteScreensaver);
router.get('/screensavers', marketingController.listScreensavers);

// Promoções (Gestão)
router.get('/promotions', marketingController.listPromotions);
router.post('/promotions', upload.single('image'), marketingController.createPromotion);
router.patch('/promotions/:id/toggle', marketingController.togglePromotion);

module.exports = router;