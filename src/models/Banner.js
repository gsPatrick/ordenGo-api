const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // NOVOS CAMPOS
  title: {
    type: DataTypes.JSONB, // { pt: "Promoção", en: "Promo" }
  },
  description: {
    type: DataTypes.JSONB, // { pt: "Compre 2 leve 3...", en: "..." }
  },
  linkedProductId: { // Se o usuário clicar, abre este produto
    type: DataTypes.UUID,
    allowNull: true,
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

module.exports = Banner;