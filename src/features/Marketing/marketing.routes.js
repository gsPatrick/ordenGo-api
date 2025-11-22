const express = require('express');
const marketingController = require('./marketing.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

// ============================================================
// ROTA PÚBLICA (Tablet)
// ============================================================
router.get('/public/:restaurantId/screensavers', (req, res, next) => {
  req.restaurantId = req.params.restaurantId;
  next();
}, marketingController.listScreensavers);

router.get('/public/:restaurantId/promotions', (req, res, next) => {
    req.restaurantId = req.params.restaurantId;
    next();
  }, marketingController.listPromotions);


// ============================================================
// ROTAS PROTEGIDAS (Gerente)
// ============================================================
router.use(protect);
router.use(restrictTo('manager', 'admin'));

// Screensavers
router.post('/screensavers', upload.single('image'), marketingController.createScreensaver);
router.delete('/screensavers/:id', marketingController.deleteScreensaver);
// Nota: O 'list' protegido usa o mesmo controller, mas o ID vem do token
router.get('/screensavers', marketingController.listScreensavers);

// Promoções
router.get('/promotions', marketingController.listPromotions);
router.post('/promotions', upload.single('image'), marketingController.createPromotion);
router.patch('/promotions/:id/toggle', marketingController.togglePromotion);

module.exports = router;