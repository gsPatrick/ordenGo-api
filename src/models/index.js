// src/models/index.js

const sequelize = require('../config/database');

// ============================================================
// 1. IMPORTAÇÃO DE TODOS OS MODELS
// ============================================================

// --- Core & SaaS ---
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const Plan = require('./Plan');
const Region = require('./Region');
const SystemSetting = require('./SystemSetting'); 
const AuditLog = require('./AuditLog');
const ExchangeRate = require('./ExchangeRate');
const EmailTemplate = require('./EmailTemplate');

// --- Financeiro & Gestão ---
const Invoice = require('./Invoice');
const LedgerEntry = require('./LedgerEntry');
const CashReport = require('./CashReport');
const Reservation = require('./Reservation');

// --- Tenant (Restaurante) ---
const Restaurant = require('./Restaurant');
const RestaurantConfig = require('./RestaurantConfig');
const RestaurantDocument = require('./RestaurantDocument');
const RestaurantNote = require('./RestaurantNote');
const PushSubscription = require('./PushSubscription');
const Ticket = require('./Ticket'); 
const TicketMessage = require('./TicketMessage');
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
const Offer = require('./Offer');

// --- Marketing Interno (Restaurante) ---
const Banner = require('./Banner');
const Promotion = require('./Promotion');
const ClientAd = require('./ClientAd'); 

// --- Rede de Publicidade (Ad Network) ---
const Advertiser = require('./Advertiser');
const Campaign = require('./Campaign');
const AdCreative = require('./AdCreative');
const AdImpression = require('./AdImpression');
const SystemAd = require('./SystemAd');

// --- Pedidos & Operação ---
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const SessionPayment = require('./SessionPayment');


// ============================================================
// 2. DEFINIÇÃO DAS ASSOCIAÇÕES (RELATIONSHIPS)
// ============================================================

// --- 2.1. SaaS & Estrutura de Cobrança ---
Plan.hasMany(Restaurant, { foreignKey: 'planId' });
Restaurant.belongsTo(Plan, { foreignKey: 'planId' });

Region.hasMany(Restaurant, { foreignKey: 'regionId' });
Restaurant.belongsTo(Region, { foreignKey: 'regionId' });


// --- 2.2. RBAC Dinâmico ---
Role.hasMany(User, { foreignKey: 'roleId' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'userRole' });

Role.belongsToMany(Permission, { through: 'RolePermissions' });
Permission.belongsToMany(Role, { through: 'RolePermissions' });


// --- 2.3. Restaurante (Core) ---
Restaurant.hasOne(RestaurantConfig, { foreignKey: 'restaurantId', as: 'config', onDelete: 'CASCADE' });
RestaurantConfig.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(RestaurantDocument, { foreignKey: 'restaurantId', onDelete: 'CASCADE' });
RestaurantDocument.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(RestaurantNote, { foreignKey: 'restaurantId', onDelete: 'CASCADE' });
RestaurantNote.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(User, { foreignKey: 'restaurantId' });
User.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

// --- 2.4. Reservas & Cash Reports (NEW) ---
Restaurant.hasMany(Reservation, { foreignKey: 'restaurantId' });
Reservation.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Restaurant.hasMany(CashReport, { foreignKey: 'restaurantId' });
CashReport.belongsTo(Restaurant, { foreignKey: 'restaurantId' });


// --- 2.5. Mesas & Sessões ---
Restaurant.hasMany(Table, { foreignKey: 'restaurantId' });
Table.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Table.hasMany(TableSession, { as: 'history', foreignKey: 'tableId', sourceKey: 'uuid' });
TableSession.belongsTo(Table, { foreignKey: 'tableId', targetKey: 'uuid' });

Table.belongsTo(TableSession, { as: 'activeSession', foreignKey: 'currentSessionId', constraints: false });

TableSession.hasMany(Order, { foreignKey: 'tableSessionId' });
Order.belongsTo(TableSession, { foreignKey: 'tableSessionId' });

TableSession.hasMany(SessionPayment, { foreignKey: 'tableSessionId' });
SessionPayment.belongsTo(TableSession, { foreignKey: 'tableSessionId' });

CashReport.hasMany(SessionPayment, { foreignKey: 'cashReportId' });
SessionPayment.belongsTo(CashReport, { foreignKey: 'cashReportId' });


// --- 2.6. Suporte (Tickets) ---
Restaurant.hasMany(Ticket, { foreignKey: 'restaurantId', onDelete: 'CASCADE' });
Ticket.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Ticket.hasMany(TicketMessage, { as: 'messages', foreignKey: 'ticketId', onDelete: 'CASCADE' });
TicketMessage.belongsTo(Ticket, { foreignKey: 'ticketId' });


// --- 2.7. Cardápio (Menu) & Ofertas ---
Restaurant.hasMany(Category, { foreignKey: 'restaurantId' });
Category.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parentId', onDelete: 'CASCADE' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

Restaurant.hasMany(Product, { foreignKey: 'restaurantId' });
Product.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

Product.hasMany(ProductVariant, { as: 'variants', foreignKey: 'productId', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });

Product.belongsToMany(ModifierGroup, { through: 'ProductModifierGroups', as: 'modifierGroups' });
ModifierGroup.belongsToMany(Product, { through: 'ProductModifierGroups', as: 'products' });

ModifierGroup.hasMany(Modifier, { as: 'options', foreignKey: 'modifierGroupId', onDelete: 'CASCADE' });
Modifier.belongsTo(ModifierGroup, { foreignKey: 'modifierGroupId' });

Restaurant.hasMany(Offer, { foreignKey: 'restaurantId' });
Offer.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Offer.belongsTo(Product, { foreignKey: 'productId' });


// --- 2.8. Pedidos (Orders) ---
Restaurant.hasMany(Order, { foreignKey: 'restaurantId' });
Order.belongsTo(Restaurant, { foreignKey: 'restaurantId' });

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });


// --- 2.9. Marketing & Ads ---
Advertiser.hasMany(Campaign, { foreignKey: 'advertiserId', onDelete: 'CASCADE' });
Campaign.belongsTo(Advertiser, { foreignKey: 'advertiserId' });

Campaign.hasMany(AdCreative, { as: 'creatives', foreignKey: 'campaignId', onDelete: 'CASCADE' });
AdCreative.belongsTo(Campaign, { foreignKey: 'campaignId' });


// ============================================================
// 3. EXPORTAÇÃO
// ============================================================

module.exports = {
  sequelize,
  User,
  Role,
  Permission,
  SystemSetting,
  AuditLog,
  EmailTemplate,
  Plan,
  Region,
  ExchangeRate,
  Invoice,
  LedgerEntry,
  CashReport,
  Reservation,
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
  Ticket,
  TicketMessage,
  Category,
  Product,
  ProductVariant,
  ModifierGroup,
  Modifier,
  Offer,
  Order,
  OrderItem,
  Banner,
  Promotion,
  ClientAd,
  Advertiser,
  Campaign,
  AdCreative,
  AdImpression,
  SystemAd
};