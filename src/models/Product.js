const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // i18n support
  name: {
    type: DataTypes.JSONB, // { pt: "Pizza Pepperoni", es: "Pizza Pepperoni" }
    allowNull: false,
  },
  description: {
    type: DataTypes.JSONB,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  imageUrl: {
    type: DataTypes.STRING,
  },
  gallery: {
    type: DataTypes.JSONB, // Array of additional URLs
    defaultValue: []
  },
  
  // Gastronomy Logic
  allergens: {
    type: DataTypes.ARRAY(DataTypes.STRING), // ["gluten", "dairy", "nuts"]
    defaultValue: []
  },
  
  pizzaConfig: {
    type: DataTypes.JSONB, // { isPizza: true, halfHalfPriceLogic: 'highest' | 'average' }
    defaultValue: { isPizza: false, halfHalfPriceLogic: 'highest' }
  },

  // Marketing & UI
  isOffer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isHighlight: { // Featured on special grid
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  
  // Ordering for Tablet
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
});

module.exports = Product;