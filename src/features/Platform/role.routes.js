const express = require('express');
const roleController = require('./role.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('superadmin'));

router.get('/permissions', restrictTo('superadmin', 'manager', 'admin'), roleController.getAllPermissions);

router.route('/')
  .get(restrictTo('superadmin', 'manager', 'admin'), roleController.getAllRoles)
  .post(restrictTo('superadmin'), roleController.createRole);

router.route('/:id')
  .patch(roleController.updateRole);

module.exports = router;
