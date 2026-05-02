const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SessionPayment = sequelize.define('SessionPayment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tableSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  cashReportId: { // Vinculado ao Caixa Aberto no momento
    type: DataTypes.UUID,
    allowNull: true,
  },
  method: {
    type: DataTypes.ENUM('cash', 'card', 'pix', 'debit', 'voucher'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  paidAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
});

module.exports = SessionPayment;
