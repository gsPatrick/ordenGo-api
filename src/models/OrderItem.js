const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  productVariantId: { // Se escolheu tamanho
    type: DataTypes.UUID,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  unitPrice: { // Preço no momento da compra (snapshot)
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  totalPrice: { // (unitPrice + modifiers) * quantity
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  modifiers: { 
    // JSONB guardando o snapshot dos modificadores escolhidos
    // Ex: [{ name: "Bacon", price: 2.00 }, { name: "Mal Passado", price: 0 }]
    // Isso evita ter que criar uma tabela OrderItemModifier e fazer joins complexos para leitura
    type: DataTypes.JSONB, 
    defaultValue: [],
  },
  observation: { // "Sem cebola"
    type: DataTypes.STRING,
  }
});

module.exports = OrderItem;