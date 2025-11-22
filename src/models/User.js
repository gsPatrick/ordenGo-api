const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, // Garçons podem não ter email, apenas PIN
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pin: { // Para acesso rápido no tablet do garçom (ex: 1234)
    type: DataTypes.STRING(4), 
    allowNull: true,
  },
role: {
  type: DataTypes.ENUM('superadmin', 'manager', 'waiter', 'kitchen'), // Adicionado superadmin
  defaultValue: 'waiter',
}
});

module.exports = User;