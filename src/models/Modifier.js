const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Modifier = sequelize.define('Modifier', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  modifierGroupId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.JSONB,
  },
  price: { // Valor a somar (pode ser 0)
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = Modifier;