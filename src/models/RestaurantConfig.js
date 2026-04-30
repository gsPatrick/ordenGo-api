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
  primaryColor: {
    type: DataTypes.STRING(7),
    defaultValue: '#df0024',
  },
  secondaryColor: {
    type: DataTypes.STRING(7),
    defaultValue: '#1f1c1d',
  },
  backgroundColor: {
    type: DataTypes.STRING(7),
    defaultValue: '#1f1c1d', 
  },
  
  // --- CONTEÚDO INSTITUCIONAL (i18n) ---
  
  // Nome de exibição comercial (ex: "A Casa da Picanha")
  publicTitle: {
    type: DataTypes.JSONB, // Ex: { pt: "Casa da Picanha", en: "Steak House" }
  },
  // Título curto da seção Sobre
  aboutTitle: {
    type: DataTypes.JSONB,
  },
  // Texto curto
  aboutText: {
    type: DataTypes.JSONB,
  },
  // História completa (Novo)
  ourHistory: {
    type: DataTypes.JSONB, // Texto longo
  },

  // --- IMAGENS INSTITUCIONAIS (Arrays de URLs) ---
  
  institutionalBanners: {
    type: DataTypes.JSONB, // Array de Strings: ["/uploads/a.jpg", "/uploads/b.jpg"]
    defaultValue: [],
  },
  highlightImagesLarge: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  highlightImagesSmall: {
    type: DataTypes.JSONB, // Deve conter idealmente 2 imagens
    defaultValue: [],
  },

  // Funcionalidades
  wifiSsid: { type: DataTypes.STRING },
  wifiPassword: { type: DataTypes.STRING },
  enableCallWaiter: { type: DataTypes.BOOLEAN, defaultValue: true },
  enableBillRequest: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = RestaurantConfig;