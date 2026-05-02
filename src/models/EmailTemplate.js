const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailTemplate = sequelize.define('EmailTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  slug: { // Ex: 'WELCOME_TENANT', 'INVOICE_OVERDUE'
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  htmlContent: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  variables: { // Ex: ["name", "order_id"]
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  }
});

module.exports = EmailTemplate;
