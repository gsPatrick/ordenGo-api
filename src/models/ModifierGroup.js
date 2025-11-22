const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ModifierGroup = sequelize.define('ModifierGroup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.JSONB, // { pt: "Escolha o Ponto", en: "Meat Temperature" }
  },
  minSelection: { // 0 = Opcional, 1 = Obrigatório
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  maxSelection: { // Quantos pode escolher
    type: DataTypes.INTEGER,
    defaultValue: 1,
  }
});

module.exports = ModifierGroup;