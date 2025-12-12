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
  // i18n
  name: {
    type: DataTypes.JSONB, // { pt: "X-Bacon", en: "Bacon Burger" }
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
  // Flags de Marketing
  isOffer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isHighlight: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Controle
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  details: {
    type: DataTypes.JSONB, // { calories: 300, allergens: ["gluten"] }
  },
  hasVariants: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
});

module.exports = Product;