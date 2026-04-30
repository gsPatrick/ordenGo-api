const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TableSession = sequelize.define('TableSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tableId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sessionToken: { // Token dinâmico para o QR Code da sessão
    type: DataTypes.STRING,
    allowNull: true,
  },
  clientName: { // Opcional, se o cliente se identificar
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('open', 'waiting_payment', 'closed'),
    defaultValue: 'open',
  },
  openedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  totalAmount: { // Soma final quando fecha
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

module.exports = TableSession;