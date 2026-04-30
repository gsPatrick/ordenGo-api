const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tableId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('CALL_WAITER', 'REQUEST_BILL'),
    allowNull: false,
  },
  // NOVO CAMPO: Método de pagamento (ex: 'credit', 'debit', 'pix', 'cash')
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
  status: {
    type: DataTypes.ENUM('pending', 'resolved'),
    defaultValue: 'pending',
  },
  resolvedAt: {
    type: DataTypes.DATE,
  }
});

module.exports = Notification;