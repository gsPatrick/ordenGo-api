const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TableDevice = sequelize.define('TableDevice', {
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
    allowNull: true, // Pode estar desvinculado temporariamente
  },
  deviceUuid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Um tablet físico único
  },
  name: {
    type: DataTypes.STRING, // "Tablet Mesa 10"
  },
  batteryLevel: {
    type: DataTypes.INTEGER,
  },
  appVersion: {
    type: DataTypes.STRING,
  },
  lastActiveAt: {
    type: DataTypes.DATE,
  },
  // --- CAMPO QUE FALTAVA ---
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
    defaultValue: 'active'
  }
});

module.exports = TableDevice;