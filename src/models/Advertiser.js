const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Advertiser = sequelize.define('Advertiser', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  companyName: {
    type: DataTypes.STRING, // "Coca-Cola", "Turismo Local"
    allowNull: false,
  },
  taxId: {
    type: DataTypes.STRING, // CNPJ, NIF, CIF
  },
  contactName: {
    type: DataTypes.STRING,
  },
  email: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  contractStart: {
    type: DataTypes.DATEONLY,
  },
  contractEnd: {
    type: DataTypes.DATEONLY,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = Advertiser;