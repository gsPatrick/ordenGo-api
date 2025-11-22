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
  slug: { // Para acesso via URL única ex: app.ordengo.com/pizzaria-luigi
    type: DataTypes.STRING,
    unique: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  planType: {
    type: DataTypes.ENUM('basic', 'premium', 'enterprise'),
    defaultValue: 'basic',
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'BRL', // USD, EUR
  },
  addressCity: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  addressState: { // UF ou Estado (ex: "SP", "RJ", "FL")
    type: DataTypes.STRING(2), 
    allowNull: true,
  },
  locales: {
    type: DataTypes.ARRAY(DataTypes.STRING), // ['pt-BR', 'en-US', 'es-ES']
    defaultValue: ['pt-BR'],
  }
});

module.exports = Restaurant;