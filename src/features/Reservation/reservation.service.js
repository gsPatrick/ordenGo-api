const { Reservation } = require('../../models');
const AppError = require('../../utils/AppError');
const { Op } = require('sequelize');

exports.createReservation = async (restaurantId, data) => {
  return await Reservation.create({ ...data, restaurantId });
};

exports.getReservations = async (restaurantId, filters = {}) => {
  const where = { restaurantId };
  
  if (filters.status) where.status = filters.status;
  if (filters.date) {
    const startOfDay = new Date(filters.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filters.date);
    endOfDay.setHours(23, 59, 59, 999);
    where.dateTime = { [Op.between]: [startOfDay, endOfDay] };
  }

  return await Reservation.findAll({
    where,
    order: [['dateTime', 'ASC']]
  });
};

exports.updateReservationStatus = async (restaurantId, id, status) => {
  const reservation = await Reservation.findOne({ where: { id, restaurantId } });
  if (!reservation) throw new AppError('Reserva não encontrada.', 404);
  
  reservation.status = status;
  await reservation.save();
  return reservation;
};

exports.deleteReservation = async (restaurantId, id) => {
  const reservation = await Reservation.findOne({ where: { id, restaurantId } });
  if (!reservation) throw new AppError('Reserva não encontrada.', 404);
  await reservation.destroy();
};
