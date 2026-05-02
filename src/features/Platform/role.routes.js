const express = require('express');
const roleController = require('./role.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('superadmin'));

router.get('/permissions', roleController.getAllPermissions);

router.route('/')
  .get(roleController.getAllRoles)
  .post(roleController.createRole);

router.route('/:id')
  .patch(roleController.updateRole);

module.exports = router;
