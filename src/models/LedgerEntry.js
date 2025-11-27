const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Livro Razão (Contabilidade Simplificada)
const LedgerEntry = sequelize.define('LedgerEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('credit', 'debit'), // Entrada ou Saída
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING, // "Assinatura SaaS", "Servidores AWS", "Comissão Vendedor"
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
  },
  transactionDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  // Vínculo opcional com a fatura que gerou isso
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: true,
  }
});

module.exports = LedgerEntry;