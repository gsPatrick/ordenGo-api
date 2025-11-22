// src/models/Promotion.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.JSONB, // { pt: "Happy Hour", en: "Happy Hour" }
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    defaultValue: 'percentage',
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  // Regras de agendamento (Dias da semana e Horário)
  activeDays: { 
    type: DataTypes.ARRAY(DataTypes.INTEGER), // [0, 1, 2, ... 6] (Dom a Sab)
    defaultValue: [0,1,2,3,4,5,6] 
  },
  startTime: {
    type: DataTypes.TIME, // "17:00"
    defaultValue: "00:00"
  },
  endTime: {
    type: DataTypes.TIME, // "20:00"
    defaultValue: "23:59"
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = Promotion;