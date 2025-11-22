const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  // i18n
  name: {
    type: DataTypes.JSONB, // { pt: "Bebidas", en: "Drinks" }
    allowNull: false,
  },
  image: { // Ícone/Thumb da categoria
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Novo: Banners promocionais específicos desta categoria
  banners: {
    type: DataTypes.JSONB, // Array ["/uploads/promo-beer.jpg"]
    defaultValue: [],
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = Category;