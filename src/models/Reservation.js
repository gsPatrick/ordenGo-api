const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reservation = sequelize.define('Reservation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerPhone: {
    type: DataTypes.STRING,
  },
  paxCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  dateTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'attended'),
    defaultValue: 'pending',
  },
  notes: {
    type: DataTypes.TEXT,
  }
});

module.exports = Reservation;
