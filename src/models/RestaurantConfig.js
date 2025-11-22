const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RestaurantConfig = sequelize.define('RestaurantConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // Identidade Visual
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  primaryColor: { // Cor dos botões principais
    type: DataTypes.STRING(7), // Hex code #FF0000
    defaultValue: '#df0024',
  },
  secondaryColor: { // Detalhes
    type: DataTypes.STRING(7),
    defaultValue: '#1f1c1d',
  },
  backgroundColor: { // Tema Dark ou Light
    type: DataTypes.STRING(7),
    defaultValue: '#1f1c1d', 
  },
  // Conteúdo "Sobre"
  aboutTitle: {
    type: DataTypes.JSONB, // { pt: "Sobre Nós", en: "About Us" }
  },
  aboutText: {
    type: DataTypes.JSONB, // Texto rico
  },
  wifiSsid: {
    type: DataTypes.STRING,
  },
  wifiPassword: {
    type: DataTypes.STRING,
  },
  // Funcionalidades
  enableCallWaiter: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  enableBillRequest: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = RestaurantConfig;