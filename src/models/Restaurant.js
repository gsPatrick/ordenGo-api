const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Restaurant = sequelize.define('Restaurant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: { 
    type: DataTypes.STRING,
    unique: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // --- NOVO CAMPO ---
  isOnboardingCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // ------------------
  planType: {
    type: DataTypes.ENUM('basic', 'premium', 'enterprise'),
    defaultValue: 'basic',
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'BRL', 
  },
  addressCity: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  addressState: { 
    type: DataTypes.STRING(2), 
    allowNull: true,
  },
  locales: {
    type: DataTypes.ARRAY(DataTypes.STRING), 
    defaultValue: ['pt-BR'],
  }
});

module.exports = Restaurant;