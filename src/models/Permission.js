const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  slug: { // Ex: 'view_finance', 'manage_tenants'
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: { // Ex: "Ver Finanças"
    type: DataTypes.STRING,
    allowNull: false,
  },
  group: { // Ex: 'finance', 'tickets', 'system'
    type: DataTypes.STRING,
  }
});

module.exports = Permission;
