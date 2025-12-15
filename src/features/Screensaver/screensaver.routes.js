const express = require('express');
const router = express.Router();
const screensaverController = require('./screensaver.controller');
const { protect } = require('../Auth/auth.controller');

// Public (Tablet fetches playlist)
router.get('/:restaurantId', screensaverController.getPlaylist);

// Protected (Manager manages ads)
router.post('/client', protect, screensaverController.createClientAd);
router.get('/client/:restaurantId', protect, screensaverController.getClientAds);
router.delete('/client/:id', protect, screensaverController.deleteClientAd);

module.exports = router;
