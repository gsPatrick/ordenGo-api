const express = require('express');
const userController = require('./user.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// Middleware Global: Login obrigatório
router.use(protect);

// Middleware Global: Apenas Gerentes podem acessar estas rotas
router.use(restrictTo('manager', 'superadmin'));

router
  .route('/')
  .get(userController.getAllMembers)
  .post(userController.createMember);

router
  .route('/:id')
  .patch(userController.updateMember)
  .delete(userController.deleteMember);

module.exports = router;