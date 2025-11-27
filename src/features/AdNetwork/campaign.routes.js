const express = require('express');
const campaignController = require('./campaign.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

// Proteção Global
router.use(protect);
router.use(restrictTo('superadmin', 'admin_sales'));

// Rotas de Campanha
router
  .route('/')
  .get(campaignController.listCampaigns)
  .post(campaignController.createCampaign);

router
  .route('/:id')
  .delete(campaignController.deleteCampaign);

// Rota de Status (Ativar/Pausar)
router.patch('/:id/status', campaignController.updateStatus);

// Rota de Upload de Criativos (Banner/Video)
router.post('/:id/creatives', upload.single('file'), campaignController.uploadCreative);

module.exports = router;