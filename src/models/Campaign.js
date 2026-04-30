const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  advertiserId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING, // "Campanha Verão 2024"
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
  },
  // Regras de Exibição
  frequency: {
    type: DataTypes.INTEGER, // Exibir a cada X minutos (ex: 5)
    defaultValue: 10,
  },
  duration: {
    type: DataTypes.INTEGER, // Duração em segundos na tela (ex: 15s)
    defaultValue: 10,
  },
  // Segmentação
  targetTags: {
    type: DataTypes.ARRAY(DataTypes.STRING), // ["Bar", "Restaurante Luxo"]
    defaultValue: [],
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'finished'),
    defaultValue: 'draft',
  }
});

module.exports = Campaign;