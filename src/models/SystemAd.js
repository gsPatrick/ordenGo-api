const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemAd = sequelize.define('SystemAd', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false, // ex: "Coca-Cola Promo Verão"
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  targetState: { 
    type: DataTypes.STRING(2), // "SP", "RJ" ou null para GLOBAL (todos)
    allowNull: true,
  },
  linkUrl: {
    type: DataTypes.STRING, // Clique para abrir site externo (opcional)
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  viewsCount: { // Métrica simples para o SuperAdmin cobrar o anunciante
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

module.exports = SystemAd;