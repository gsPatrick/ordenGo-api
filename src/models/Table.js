const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Table = sequelize.define('Table', {
  id: {
    type: DataTypes.INTEGER, // Número da mesa (Mesa 1, 2, 3...)
    primaryKey: true,
    autoIncrement: true, // ATENÇÃO: Melhor usar UUID se for multi-tenant em tabela única, ou composite key (restaurantId + number)
  },
  // Vamos usar UUID para ID interno, e um campo number para exibição
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  number: { // O número que aparece no adesivo da mesa
    type: DataTypes.STRING, // String para permitir "10A", "10B"
    allowNull: false,
  },
  qrCodeToken: { // Token único para gerar a URL da mesa
    type: DataTypes.STRING,
    unique: true,
  },
  status: { // Status visual instantâneo
    type: DataTypes.ENUM('free', 'occupied', 'reserved', 'calling', 'closing'),
    defaultValue: 'free',
  },
  currentSessionId: { // Ponteiro para a sessão ativa (se houver)
    type: DataTypes.UUID,
    allowNull: true,
  },
  lifetimeSessionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Quantas vezes essa mesa foi aberta desde a criação'
  },
  lifetimeOccupiedSeconds: {
    type: DataTypes.BIGINT, // BIGINT para aguentar muitos segundos
    defaultValue: 0,
    comment: 'Total de segundos que a mesa esteve ocupada na vida útil'
  }
});

module.exports = Table;