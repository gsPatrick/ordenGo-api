// src/models/index.js

const sequelize = require('../config/database');

// 1. Importação de TODOS os Models
const Restaurant = require('./Restaurant');
const RestaurantConfig = require('./RestaurantConfig');
const User = require('./User');
const PushSubscription = require('./PushSubscription'); 
const Banner = require('./Banner'); 
const SystemAd = require('./SystemAd'); 
const Promotion = require('./Promotion');
const Category = require('./Category');
const Product = require('./Product');
const ProductVariant = require('./ProductVariant');
const ModifierGroup = require('./ModifierGroup');
const Modifier = require('./Modifier');
const Table = require('./Table');
const TableSession = require('./TableSession');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Notification = require('./Notification');
const Review = require('./Review');

// ============================================================
// DEFINIÇÃO DAS ASSOCIAÇÕES (RELATIONSHIPS)
// ============================================================

// --- 1. Tenant Principal (Restaurante) ---
Restaurant.hasOne(RestaurantConfig, { foreignKey: 'restaurantId', as: 'config' });
RestaurantConfig.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(User, { foreignKey: 'restaurantId' });
User.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(PushSubscription, { foreignKey: 'restaurantId' });
PushSubscription.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

User.hasMany(PushSubscription, { foreignKey: 'userId' });
PushSubscription.belongsTo(User, { foreignKey: 'userId' });

Restaurant.hasMany(Banner, { foreignKey: 'restaurantId' });
Banner.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Promotion, { foreignKey: 'restaurantId' });
Promotion.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Table, { foreignKey: 'restaurantId' });
Table.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Category, { foreignKey: 'restaurantId' });
Category.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Product, { foreignKey: 'restaurantId' });
Product.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(ModifierGroup, { foreignKey: 'restaurantId' });
ModifierGroup.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Order, { foreignKey: 'restaurantId' });
Order.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Notification, { foreignKey: 'restaurantId' });
Notification.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Review, { foreignKey: 'restaurantId' });
Review.belongsTo(Restaurant, { foreignKey: 'restaurantId' });


// --- 2. Hierarquia do Menu ---
Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

Product.hasMany(ProductVariant, { as: 'variants', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });

Product.belongsToMany(ModifierGroup, { through: 'ProductModifierGroups', as: 'modifierGroups' });
ModifierGroup.belongsToMany(Product, { through: 'ProductModifierGroups', as: 'products' });

ModifierGroup.hasMany(Modifier, { as: 'options', foreignKey: 'modifierGroupId', onDelete: 'CASCADE' });
Modifier.belongsTo(ModifierGroup, { foreignKey: 'modifierGroupId' });


// --- 3. Mesas e Sessões (CORREÇÃO DE UUID) ---

// CRÍTICO: Adicionamos sourceKey: 'uuid' e targetKey: 'uuid'
// Isso força o Sequelize a fazer o JOIN usando a coluna UUID da mesa, e não o ID (Integer)

Table.hasMany(TableSession, { as: 'history', foreignKey: 'tableId', sourceKey: 'uuid' });
TableSession.belongsTo(Table, { foreignKey: 'tableId', targetKey: 'uuid' });

// Relação para sessão ativa
Table.belongsTo(TableSession, { as: 'activeSession', foreignKey: 'currentSessionId', constraints: false });

// Notificações da Mesa (CORREÇÃO AQUI)
Table.hasMany(Notification, { as: 'notifications', foreignKey: 'tableId', sourceKey: 'uuid' });
Notification.belongsTo(Table, { foreignKey: 'tableId', targetKey: 'uuid' });

// Avaliações da Mesa (CORREÇÃO AQUI)
Table.hasMany(Review, { foreignKey: 'tableId', sourceKey: 'uuid' });
Review.belongsTo(Table, { foreignKey: 'tableId', targetKey: 'uuid' });


// --- 4. Pedidos e Operação ---
TableSession.hasMany(Order, { as: 'orders', foreignKey: 'tableSessionId' });
Order.belongsTo(TableSession, { foreignKey: 'tableSessionId' });

TableSession.hasMany(Review, { foreignKey: 'tableSessionId' });
Review.belongsTo(TableSession, { foreignKey: 'tableSessionId' });

User.hasMany(Order, { as: 'sales', foreignKey: 'waiterId' });
Order.belongsTo(User, { as: 'waiter', foreignKey: 'waiterId' });


// --- 5. Itens do Pedido ---
Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

OrderItem.belongsTo(Product, { foreignKey: 'productId' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'productVariantId' });


// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = {
  sequelize,
  Restaurant,
  RestaurantConfig,
  User,
  PushSubscription,
  Banner,
  SystemAd,
  Promotion,
  Category,
  Product,
  ProductVariant,
  ModifierGroup,
  Modifier,
  Table,
  TableSession,
  Order,
  OrderItem,
  Notification,
  Review
};