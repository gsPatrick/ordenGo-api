const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Restaurant = sequelize.define('Restaurant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: { 
    type: DataTypes.STRING,
    unique: true,
  },
  // Dados Fiscais Europeus
  taxId: { // NIF, CIF, P.IVA, Steuernummer
    type: DataTypes.STRING,
  },
  billingAddress: {
    type: DataTypes.TEXT,
  },
  contactPerson: {
    type: DataTypes.STRING,
  },
  // --- CRÍTICO PARA EUROPA ---
  timezone: {
    type: DataTypes.STRING, 
    defaultValue: 'Europe/Madrid', // Ex: 'Europe/Berlin', 'Atlantic/Canary'
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING(2), // ES, DE, IT, FR
    defaultValue: 'ES',
  },
  // ---------------------------
  
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isOnboardingCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  
  planId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  regionId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  
  // Vigência do Contrato SaaS
  contractStartDate: {
    type: DataTypes.DATEONLY,
  },
  contractRenewalDate: {
    type: DataTypes.DATEONLY,
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR', // Padrão alterado para Euro
  },
  locales: {
    type: DataTypes.ARRAY(DataTypes.STRING), 
    // Suporte aos idiomas principais
    defaultValue: ['es-ES', 'en-US', 'de-DE', 'it-IT', 'fr-FR', 'pt-PT'],
  }
});

module.exports = Restaurant;