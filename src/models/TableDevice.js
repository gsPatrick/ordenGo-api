// src/models/TableDevice.js
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
  // O "RG" do Tablet (gerado no frontend e salvo no LocalStorage)
  deviceUuid: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, 
  },
  // Nome amigável para o Gerente identificar (Ex: "Tablet Salão Janela")
  name: {
    type: DataTypes.STRING,
    defaultValue: 'Novo Tablet',
  },
  // A qual mesa este tablet está vinculado AGORA?
  tableId: {
    type: DataTypes.UUID,
    allowNull: true, // Pode estar "desvinculado" (na gaveta)
  },
  // Telemetria
  lastActiveAt: {
    type: DataTypes.DATE,
  },
  batteryLevel: {
    type: DataTypes.INTEGER, // Opcional: Frontend manda % da bateria
  },
  appVersion: {
    type: DataTypes.STRING, // Para saber se precisa atualizar
  }
});

module.exports = TableDevice;