const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Tabela de Logs de Exibição (Auditoria de Ads)
// Cuidado: Esta tabela pode crescer muito. Idealmente seria um banco NoSQL ou TimescaleDB.
// Para MVP, usaremos Postgres com índices.
const AdImpression = sequelize.define('AdImpression', {
  id: {
    type: DataTypes.BIGINT, // BIGINT pois serão milhões de registros
    autoIncrement: true,
    primaryKey: true,
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  creativeId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tableId: {
    type: DataTypes.UUID, // Para saber exatamente qual tablet exibiu
    allowNull: true,
  },
  regionId: { // Desnormalizado para facilitar query de relatório
    type: DataTypes.UUID,
    allowNull: true,
  },
  viewedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  indexes: [
    { fields: ['campaignId'] },
    { fields: ['restaurantId'] },
    { fields: ['viewedAt'] }
  ],
  timestamps: false // Não precisamos de updatedAt
});

module.exports = AdImpression;