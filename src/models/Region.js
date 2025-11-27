const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Region = sequelize.define('Region', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING, 
    allowNull: false,
  },
  country: {
    type: DataTypes.ENUM('ES', 'DE', 'IT', 'FR', 'PT', 'UK', 'BR'), 
    defaultValue: 'ES'
  },
  // --- NOVOS CAMPOS FISCAIS ---
  taxName: { // Ex: "IGIC", "IVA", "MwSt"
    type: DataTypes.STRING,
    defaultValue: 'IVA'
  },
  taxRule: { // Ex: 7.00, 21.00
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  // ----------------------------
  description: {
    type: DataTypes.TEXT,
  }
});

module.exports = Region;