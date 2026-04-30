const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // MODIFICADO: Agora pode ser nulo se for equipe interna do SaaS (SuperAdmin)
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: true, 
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pin: { 
    type: DataTypes.STRING(4), 
    allowNull: true,
  },
  // MODIFICADO: Adicionadas roles da equipe interna
  role: {
    type: DataTypes.ENUM(
      // Roles de Restaurante
      'manager', 'waiter', 'kitchen',
      // Roles de SaaS / Equipe Interna
      'superadmin', 'admin_finance', 'admin_support', 'admin_sales'
    ),
    defaultValue: 'waiter',
  },
  // NOVO: Recuperação de Senha
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

module.exports = User;
