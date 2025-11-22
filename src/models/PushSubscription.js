const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: { // Vincula ao Garçom específico
    type: DataTypes.UUID,
    allowNull: false,
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true, // Evita duplicatas do mesmo navegador
  },
  // As chaves de criptografia do navegador (p256dh, auth)
  keys: {
    type: DataTypes.JSONB,
    allowNull: false,
  }
});

module.exports = PushSubscription;