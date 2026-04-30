const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemSetting = sequelize.define('SystemSetting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true, // Ex: 'stripe_secret_key', 'smtp_host'
    allowNull: false,
  },
  value: {
    type: DataTypes.TEXT, // Pode guardar strings longas ou JSON stringified
    allowNull: true,
  },
  group: {
    type: DataTypes.STRING, // 'payment', 'email', 'general'
    defaultValue: 'general'
  },
  isPublic: {
    type: DataTypes.BOOLEAN, // Se true, pode ser enviado para o front (ex: stripe_public_key)
    defaultValue: false
  },
  description: {
    type: DataTypes.STRING,
  }
});

module.exports = SystemSetting;