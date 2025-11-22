// src/models/index.js

const sequelize = require('../config/database');

// 1. Importação de TODOS os Models
const Restaurant = require('./Restaurant');
const RestaurantConfig = require('./RestaurantConfig');
const User = require('./User');
const PushSubscription = require('./PushSubscription'); // Novo: Notificações PWA
const Banner = require('./Banner'); // Screensavers internos
const SystemAd = require('./SystemAd'); // Ads do SuperAdmin
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
// O Restaurante é o "Pai" de quase tudo para garantir o isolamento dos dados (Multi-tenancy)

// Configurações
Restaurant.hasOne(RestaurantConfig, { foreignKey: 'restaurantId', as: 'config' });
RestaurantConfig.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Equipe
Restaurant.hasMany(User, { foreignKey: 'restaurantId' });
User.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Notificações Push (PWA)
Restaurant.hasMany(PushSubscription, { foreignKey: 'restaurantId' });
PushSubscription.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

User.hasMany(PushSubscription, { foreignKey: 'userId' });
PushSubscription.belongsTo(User, { foreignKey: 'userId' });

// Marketing
Restaurant.hasMany(Banner, { foreignKey: 'restaurantId' });
Banner.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Promotion, { foreignKey: 'restaurantId' });
Promotion.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Estrutura Física
Restaurant.hasMany(Table, { foreignKey: 'restaurantId' });
Table.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Menu
Restaurant.hasMany(Category, { foreignKey: 'restaurantId' });
Category.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Product, { foreignKey: 'restaurantId' });
Product.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(ModifierGroup, { foreignKey: 'restaurantId' });
ModifierGroup.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Operação
Restaurant.hasMany(Order, { foreignKey: 'restaurantId' });
Order.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Notification, { foreignKey: 'restaurantId' });
Notification.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Review, { foreignKey: 'restaurantId' });
Review.belongsTo(Restaurant, { foreignKey: 'restaurantId' });


// --- 2. Hierarquia do Menu ---

// Categorias e Subcategorias (Auto-relacionamento)
Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

// Produtos e Variações (Tamanhos)
Product.hasMany(ProductVariant, { as: 'variants', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });

// Modificadores (N:N entre Produto e Grupo de Modificadores)
Product.belongsToMany(ModifierGroup, { through: 'ProductModifierGroups', as: 'modifierGroups' });
ModifierGroup.belongsToMany(Product, { through: 'ProductModifierGroups', as: 'products' });

ModifierGroup.hasMany(Modifier, { as: 'options', foreignKey: 'modifierGroupId', onDelete: 'CASCADE' });
Modifier.belongsTo(ModifierGroup, { foreignKey: 'modifierGroupId' });


// --- 3. Mesas e Sessões (Ciclo de Vida) ---

// Histórico de sessões da mesa
Table.hasMany(TableSession, { as: 'history', foreignKey: 'tableId' });
TableSession.belongsTo(Table, { foreignKey: 'tableId' });

// Relação especial para acesso rápido à sessão ATUAL
// 'constraints: false' evita erros de chave estrangeira cíclica ao criar tabelas
Table.belongsTo(TableSession, { as: 'activeSession', foreignKey: 'currentSessionId', constraints: false });

// Notificações da Mesa
Table.hasMany(Notification, { as: 'notifications', foreignKey: 'tableId' });
Notification.belongsTo(Table, { foreignKey: 'tableId' });

// Avaliações da Mesa (Rastreabilidade)
Table.hasMany(Review, { foreignKey: 'tableId' });
Review.belongsTo(Table, { foreignKey: 'tableId' });


// --- 4. Pedidos e Operação ---

// Pedidos pertencem a uma Sessão
TableSession.hasMany(Order, { as: 'orders', foreignKey: 'tableSessionId' });
Order.belongsTo(TableSession, { foreignKey: 'tableSessionId' });

// Rastreabilidade da Sessão na Avaliação
TableSession.hasMany(Review, { foreignKey: 'tableSessionId' });
Review.belongsTo(TableSession, { foreignKey: 'tableSessionId' });

// Pedidos e Garçom
User.hasMany(Order, { as: 'sales', foreignKey: 'waiterId' });
Order.belongsTo(User, { as: 'waiter', foreignKey: 'waiterId' });


// --- 5. Itens do Pedido ---

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

OrderItem.belongsTo(Product, { foreignKey: 'productId' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'productVariantId' }); // Pode ser null se não tiver variante


// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = {
  sequelize,
  Restaurant,
  RestaurantConfig,
  User,
  PushSubscription, // Exportando o novo model
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