const express = require('express');
const regionController = require('./region.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas abaixo são protegidas e exclusivas para SuperAdmin
// (Ou Admin de Vendas, se implementarmos granularidade depois)
router.use(protect);
router.use(restrictTo('superadmin', 'admin_sales'));

// Rotas de Regiões (DB)
router
  .route('/')
  .get(regionController.listRegions)
  .post(regionController.createRegion);

router
  .route('/:id')
  .patch(regionController.updateRegion)
  .delete(regionController.deleteRegion);

// Rota Auxiliar: Cidades Externas
// GET /api/v1/admin/regions/cities/ES
router.get('/cities/:country', regionController.getCities);

module.exports = router;