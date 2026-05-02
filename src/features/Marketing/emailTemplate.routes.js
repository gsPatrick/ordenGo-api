const express = require('express');
const emailTemplateController = require('./emailTemplate.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('superadmin'));

router.route('/')
  .get(emailTemplateController.getAllTemplates)
  .post(emailTemplateController.createTemplate);

router.route('/:id')
  .get(emailTemplateController.getTemplate)
  .patch(emailTemplateController.updateTemplate)
  .delete(emailTemplateController.deleteTemplate);

module.exports = router;
