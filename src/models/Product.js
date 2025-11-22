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
  name: {
    type: DataTypes.JSONB, 
    allowNull: false,
  },
  description: {
    type: DataTypes.JSONB,
  },
  price: { // Preço base. Se tiver variantes, este pode ser 0 ou o preço da menor variante.
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  imageUrl: {
    type: DataTypes.STRING,
  },
  isAvailable: { // O famoso "86" (acabou no estoque)
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  details: {
    type: DataTypes.JSONB, // { calories: 300, allergens: ["gluten"], prepTime: "15min" }
  },
  hasVariants: { // Flag para facilitar o frontend saber se abre modal de opções
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
});

module.exports = Product;