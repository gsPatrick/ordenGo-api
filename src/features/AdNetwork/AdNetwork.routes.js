const express = require('express');
const advertiserController = require('./advertiser.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// Proteção Global (Apenas Super Admin e possivelmente equipe de Vendas/Ads)
router.use(protect);
router.use(restrictTo('superadmin', 'admin_sales'));

router
  .route('/')
  .get(advertiserController.list)
  .post(advertiserController.create);

router
  .route('/:id')
  .get(advertiserController.getOne)
  .patch(advertiserController.update)
  .delete(advertiserController.delete);

module.exports = router;