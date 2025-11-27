const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true, // Pode ser sistema ou user deletado
  },
  action: {
    type: DataTypes.STRING, // "CREATE_RESTAURANT", "DELETE_USER", "CHANGE_PLAN_PRICE"
    allowNull: false,
  },
  targetResource: {
    type: DataTypes.STRING, // "Restaurant: uuid..."
  },
  ipAddress: {
    type: DataTypes.STRING,
  },
  details: {
    type: DataTypes.JSONB, // O que mudou (Diff)
  }
});

module.exports = AuditLog;