// src/models/Review.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tableId: { // Saber de qual mesa veio (física)
    type: DataTypes.UUID,
    allowNull: true, 
  },
  tableSessionId: { // Saber qual foi a "sentada" específica (histórico)
    type: DataTypes.UUID,
    allowNull: true,
  },
  clientName: {
    type: DataTypes.STRING, // "Tiago Castro"
  },
  ratingGlobal: {
    type: DataTypes.INTEGER, // 1 a 5
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  // Notas específicas: { food: 5, service: 4, ambience: 5, music: 3 }
  ratings: {
    type: DataTypes.JSONB, 
    defaultValue: {}
  },
  comment: {
    type: DataTypes.TEXT,
  },
  contactInfo: { // Opcional: Email ou telefone se o cliente quiser deixar
    type: DataTypes.JSONB, // { email: "...", phone: "..." }
  }
});

module.exports = Review;