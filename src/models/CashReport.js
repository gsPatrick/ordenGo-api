const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CashReport = sequelize.define('CashReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  openingTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  closingTime: {
    type: DataTypes.DATE,
  },
  
  // Financials
  openingAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  closingAmount: {
    type: DataTypes.DECIMAL(10, 2),
  },
  withdrawals: { // Sangrias
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  
  // Totals by Method
  totalCash: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  totalCard: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  totalSales: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  
  status: {
    type: DataTypes.ENUM('open', 'closed'),
    defaultValue: 'open',
  }
});

module.exports = CashReport;
