const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING, 
    allowNull: false,
  },
  priceMonthly: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  priceYearly: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR', // Ajustado para Euro
  },
  maxTablets: {
    type: DataTypes.INTEGER, 
    defaultValue: 5,
  },
  features: {
    type: DataTypes.JSONB, 
    defaultValue: {},
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = Plan;
