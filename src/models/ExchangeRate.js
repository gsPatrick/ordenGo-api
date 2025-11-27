const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExchangeRate = sequelize.define('ExchangeRate', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fromCurrency: {
    type: DataTypes.STRING(3), // "USD"
    allowNull: false,
  },
  toCurrency: {
    type: DataTypes.STRING(3), // "BRL"
    allowNull: false,
  },
  rate: {
    type: DataTypes.DECIMAL(10, 4), // Ex: 5.1500
    allowNull: false,
  }
});

module.exports = ExchangeRate;
