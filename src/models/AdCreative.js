const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdCreative = sequelize.define('AdCreative', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('image', 'video'),
    defaultValue: 'image',
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  linkUrl: {
    type: DataTypes.STRING, // Link externo ao clicar (QR Code ou Redirecionamento)
  },
  viewsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  clicksCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
});

module.exports = AdCreative;
