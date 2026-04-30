const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('saas_subscription', 'ad_revenue'),
    allowNull: false,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  advertiserId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  
  // --- DETALHAMENTO FISCAL EUROPA ---
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR',
  },
  subtotal: { // Valor sem imposto
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  taxName: { // Ex: "IVA", "IGIC", "MwSt"
    type: DataTypes.STRING, 
    defaultValue: 'IVA'
  },
  taxRate: { // Ex: 21.00 (%), 7.00 (%)
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  taxAmount: { // Valor calculado do imposto
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  total: { // Subtotal + TaxAmount
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  // ----------------------------------

  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'draft',
  },
  dueDate: {
    type: DataTypes.DATEONLY,
  },
  paidAt: {
    type: DataTypes.DATE,
  },
  pdfUrl: {
    type: DataTypes.STRING,
  }
});

module.exports = Invoice;