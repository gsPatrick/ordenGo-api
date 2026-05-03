const express = require('express');
const reservationController = require('./reservation.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('manager', 'admin', 'superadmin'));

router.get('/', reservationController.listReservations);
router.post('/', reservationController.createReservation);
router.patch('/:id/status', reservationController.updateStatus);
router.delete('/:id', reservationController.deleteReservation);

module.exports = router;
