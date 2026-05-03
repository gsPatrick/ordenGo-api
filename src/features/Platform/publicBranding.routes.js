const express = require('express');
const systemService = require('../Settings/system.service');
const catchAsync = require('../../utils/catchAsync');
const router = express.Router();

router.get('/', catchAsync(async (req, res) => {
  const settings = await systemService.getSettingsByGroup('branding');
  const branding = {};
  settings.forEach(s => branding[s.key] = s.value);
  res.status(200).json({ status: 'success', data: branding });
}));

module.exports = router;
