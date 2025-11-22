const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tableSessionId: { // Vinculado à sessão, não só à mesa
    type: DataTypes.UUID,
    allowNull: false,
  },
  waiterId: { // Se foi um garçom que lançou pelo tablet dele
    type: DataTypes.UUID,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled'),
    defaultValue: 'pending',
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  notes: { // Observação geral do pedido
    type: DataTypes.TEXT,
  }
});

module.exports = Order;