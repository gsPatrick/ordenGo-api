// src/models/index.js

const sequelize = require('../config/database');

// ============================================================
// 1. IMPORTAÇÃO DE TODOS OS MODELS
// ============================================================

// --- Core & SaaS ---
const User = require('./User');
const Plan = require('./Plan');
const Region = require('./Region');
const SystemSetting = require('./SystemSetting'); // Configurações Globais
const AuditLog = require('./AuditLog');
const ExchangeRate = require('./ExchangeRate');

// --- Financeiro ---
const Invoice = require('./Invoice');
const LedgerEntry = require('./LedgerEntry');

// --- Tenant (Restaurante) ---
const Restaurant = require('./Restaurant');
const RestaurantConfig = require('./RestaurantConfig');
const RestaurantDocument = require('./RestaurantDocument');
const RestaurantNote = require('./RestaurantNote');
const PushSubscription = require('./PushSubscription');
const Table = require('./Table');
const TableSession = require('./TableSession');
const TableDevice = require('./TableDevice');
const Notification = require('./Notification');
const Review = require('./Review');

// --- Cardápio (Menu) ---
const Category = require('./Category');
const Product = require('./Product');
const ProductVariant = require('./ProductVariant');
const ModifierGroup = require('./ModifierGroup');
const Modifier = require('./Modifier');

// --- Marketing Interno (Restaurante) ---
const Banner = require('./Banner');
const Promotion = require('./Promotion');
const ClientAd = require('./ClientAd'); // Novo Screensaver

// --- Rede de Publicidade (Ad Network) ---
const Advertiser = require('./Advertiser');
const Campaign = require('./Campaign');
const AdCreative = require('./AdCreative');
const AdImpression = require('./AdImpression');

// --- Pedidos & Operação ---
const Order = require('./Order');
const OrderItem = require('./OrderItem');


// ============================================================
// 2. DEFINIÇÃO DAS ASSOCIAÇÕES (RELATIONSHIPS)
// ============================================================

// --- 2.1. SaaS & Estrutura de Cobrança ---
// Planos e Regiões definem o comportamento do Restaurante
Plan.hasMany(Restaurant, { foreignKey: 'planId' });
Restaurant.belongsTo(Plan, { foreignKey: 'planId' });

Region.hasMany(Restaurant, { foreignKey: 'regionId' });
Restaurant.belongsTo(Region, { foreignKey: 'regionId' });


// --- 2.2. Restaurante (Core) ---
// Configurações Visuais
Restaurant.hasOne(RestaurantConfig, { foreignKey: 'restaurantId', as: 'config', onDelete: 'CASCADE' });
RestaurantConfig.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Documentos
Restaurant.hasMany(RestaurantDocument, { foreignKey: 'restaurantId', onDelete: 'CASCADE' });
RestaurantDocument.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Notas (Notes)
Restaurant.hasMany(RestaurantNote, { foreignKey: 'restaurantId', onDelete: 'CASCADE' });
RestaurantNote.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Equipe
Restaurant.hasMany(User, { foreignKey: 'restaurantId' });
User.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Notificações Push dos Garçons
Restaurant.hasMany(PushSubscription, { foreignKey: 'restaurantId' });
PushSubscription.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

User.hasMany(PushSubscription, { foreignKey: 'userId', onDelete: 'CASCADE' });
PushSubscription.belongsTo(User, { foreignKey: 'userId' });


// --- 2.3. Mesas, Dispositivos e Sessões ---
Restaurant.hasMany(Table, { foreignKey: 'restaurantId' });
Table.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Histórico de Sessões da Mesa
Table.hasMany(TableSession, { as: 'history', foreignKey: 'tableId', sourceKey: 'uuid' });
TableSession.belongsTo(Table, { foreignKey: 'tableId', targetKey: 'uuid' });

// Sessão Ativa (Ponteiro)
Table.belongsTo(TableSession, { as: 'activeSession', foreignKey: 'currentSessionId', constraints: false });

// Dispositivos (Tablets) vinculados à Mesa
Table.hasMany(TableDevice, { as: 'devices', foreignKey: 'tableId', sourceKey: 'uuid' });
TableDevice.belongsTo(Table, { foreignKey: 'tableId', targetKey: 'uuid' });

// Notificações (Chamar Garçom)
Restaurant.hasMany(Notification, { foreignKey: 'restaurantId' });
Notification.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Table.hasMany(Notification, { as: 'notifications', foreignKey: 'tableId', sourceKey: 'uuid' });
Notification.belongsTo(Table, { foreignKey: 'tableId', targetKey: 'uuid' });

// Avaliações
Restaurant.hasMany(Review, { foreignKey: 'restaurantId' });
Review.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Table.hasMany(Review, { foreignKey: 'tableId', sourceKey: 'uuid' });
Review.belongsTo(Table, { foreignKey: 'tableId', targetKey: 'uuid' });

TableSession.hasMany(Review, { foreignKey: 'tableSessionId' });
Review.belongsTo(TableSession, { foreignKey: 'tableSessionId' });


// --- 2.4. Cardápio (Menu) ---
Restaurant.hasMany(Category, { foreignKey: 'restaurantId' });
Category.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(Product, { foreignKey: 'restaurantId' });
Product.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(ModifierGroup, { foreignKey: 'restaurantId' });
ModifierGroup.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Hierarquia de Categorias (Recursiva)
Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parentId', onDelete: 'CASCADE' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

// Variantes e Modificadores
Product.hasMany(ProductVariant, { as: 'variants', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });

// Muitos-para-Muitos: Produtos <-> Grupos de Modificadores
Product.belongsToMany(ModifierGroup, { through: 'ProductModifierGroups', as: 'modifierGroups' });
ModifierGroup.belongsToMany(Product, { through: 'ProductModifierGroups', as: 'products' });

ModifierGroup.hasMany(Modifier, { as: 'options', foreignKey: 'modifierGroupId', onDelete: 'CASCADE' });
Modifier.belongsTo(ModifierGroup, { foreignKey: 'modifierGroupId' });


// --- 2.5. Pedidos (Orders) ---
TableSession.hasMany(Order, { as: 'orders', foreignKey: 'tableSessionId' });
Order.belongsTo(TableSession, { foreignKey: 'tableSessionId' });

Restaurant.hasMany(Order, { foreignKey: 'restaurantId' });
Order.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

User.hasMany(Order, { as: 'sales', foreignKey: 'waiterId' });
Order.belongsTo(User, { as: 'waiter', foreignKey: 'waiterId' });

// Itens do Pedido
Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

OrderItem.belongsTo(Product, { foreignKey: 'productId' });
OrderItem.belongsTo(ProductVariant, { foreignKey: 'productVariantId' });


// --- 2.6. Marketing Interno ---
Restaurant.hasMany(Banner, { foreignKey: 'restaurantId' });
Banner.belongsTo(Restaurant, { foreignKey: 'restaurantId' });
Banner.belongsTo(Product, { foreignKey: 'linkedProductId', as: 'linkedProduct' });

Restaurant.hasMany(Promotion, { foreignKey: 'restaurantId' });
Restaurant.hasMany(Promotion, { foreignKey: 'restaurantId' });
Promotion.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// Screensaver Ads (Client)
Restaurant.hasMany(ClientAd, { foreignKey: 'restaurantId', onDelete: 'CASCADE' });
ClientAd.belongsTo(Restaurant, { foreignKey: 'restaurantId' });


// --- 2.7. Ad Network (Publicidade Global) ---
Advertiser.hasMany(Campaign, { foreignKey: 'advertiserId', onDelete: 'CASCADE' });
Campaign.belongsTo(Advertiser, { foreignKey: 'advertiserId' });

Campaign.hasMany(AdCreative, { as: 'creatives', foreignKey: 'campaignId', onDelete: 'CASCADE' });
AdCreative.belongsTo(Campaign, { foreignKey: 'campaignId' });

// Segmentação: Campanhas <-> Regiões (Muitos-para-Muitos)
Campaign.belongsToMany(Region, { through: 'CampaignRegions' });
Region.belongsToMany(Campaign, { through: 'CampaignRegions' });

// Auditoria de Impressões (Big Data)
Campaign.hasMany(AdImpression, { foreignKey: 'campaignId' });
AdImpression.belongsTo(Campaign, { foreignKey: 'campaignId' });

AdCreative.hasMany(AdImpression, { foreignKey: 'creativeId' });
AdImpression.belongsTo(AdCreative, { foreignKey: 'creativeId' });

Restaurant.hasMany(AdImpression, { foreignKey: 'restaurantId' });
AdImpression.belongsTo(Restaurant, { foreignKey: 'restaurantId' });


// --- 2.8. Financeiro & Contabilidade ---
// Faturas podem ser de Restaurantes (SaaS) ou Anunciantes (Ads)
Restaurant.hasMany(Invoice, { foreignKey: 'restaurantId' });
Invoice.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Advertiser.hasMany(Invoice, { foreignKey: 'advertiserId' });
Invoice.belongsTo(Advertiser, { foreignKey: 'advertiserId' });

// Livro Razão ligado à Fatura
Invoice.hasMany(LedgerEntry, { foreignKey: 'invoiceId' });
LedgerEntry.belongsTo(Invoice, { foreignKey: 'invoiceId' });


// --- 2.9. Auditoria & Segurança ---
User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });


// ============================================================
// 3. EXPORTAÇÃO
// ============================================================

module.exports = {
  sequelize,
  // Core System
  User,
  SystemSetting,
  AuditLog,

  // SaaS Business
  Plan,
  Region,
  ExchangeRate,

  // Financeiro
  Invoice,
  LedgerEntry,

  // Tenant Models
  Restaurant,
  RestaurantConfig,
  RestaurantDocument,
  RestaurantNote,
  PushSubscription,
  Table,
  TableSession,
  TableDevice,
  Notification,
  Review,

  // Menu Models
  Category,
  Product,
  ProductVariant,
  ModifierGroup,
  Modifier,

  // Order Models
  Order,
  OrderItem,

  // Marketing Interno
  Banner,
  Banner,
  Promotion,
  ClientAd,

  // Ad Network
  Advertiser,
  Campaign,
  AdCreative,
  AdImpression
};