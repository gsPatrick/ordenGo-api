const reservationService = require('./reservation.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

exports.listReservations = catchAsync(async (req, res, next) => {
  // Filtramos por el restaurante del usuario autenticado (manager)
  const reservations = await reservationService.getReservations(req.user.restaurantId, req.query);
  
  res.status(200).json({
    status: 'success',
    results: reservations.length,
    data: { reservations }
  });
});

exports.createReservation = catchAsync(async (req, res, next) => {
  const reservation = await reservationService.createReservation(req.user.restaurantId, req.body);
  
  res.status(201).json({
    status: 'success',
    data: { reservation }
  });
});

exports.updateStatus = catchAsync(async (req, res, next) => {
  const reservation = await reservationService.updateReservationStatus(
    req.user.restaurantId, 
    req.params.id, 
    req.body.status
  );
  
  res.status(200).json({
    status: 'success',
    data: { reservation }
  });
});

exports.deleteReservation = catchAsync(async (req, res, next) => {
  await reservationService.deleteReservation(req.user.restaurantId, req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});
