const express = require('express');
const advertiserController = require('./advertiser.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const { logAction } = require('../../middlewares/auditMiddleware'); // Opcional: Se quiser logar ações

const router = express.Router();

// ============================================================
// MIDDLEWARES DE SEGURANÇA
// ============================================================
// Apenas Super Admin e Equipe de Vendas/Ads podem acessar
router.use(protect);
router.use(restrictTo('superadmin', 'admin_sales'));

// ============================================================
// ENDPOINTS
// ============================================================

router
  .route('/')
  .get(advertiserController.list)
  .post(
    logAction('CREATE_ADVERTISER'), // Log de Auditoria
    advertiserController.create
  );

router
  .route('/:id')
  .get(advertiserController.getOne)
  .patch(
    logAction('UPDATE_ADVERTISER'), 
    advertiserController.update
  )
  .delete(
    logAction('DELETE_ADVERTISER'), 
    advertiserController.delete
  );

module.exports = router;