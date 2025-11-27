const express = require('express');
const router = express.Router();

// ==============================================================================
// 1. IMPORTAÇÃO DAS ROTAS (FEATURES)
// ==============================================================================

// --- Autenticação & Core ---
const authRoutes = require('../features/Auth/auth.routes');

// --- Super Admin (SaaS, Ads, Financeiro, Regiões) ---
// Este arquivo agrega: /tenants, /plans, /regions, /advertisers, /campaigns, /finance, /analytics, /settings
const superAdminRoutes = require('../features/SuperAdmin/superAdmin.routes');

// --- Gestão do Restaurante (Manager) ---
const restaurantRoutes = require('../features/Restaurant/restaurant.routes'); // Configs visuais e gerais
const userRoutes = require('../features/User/user.routes'); // Equipe (Garçons/Gerentes)
const menuRoutes = require('../features/Menu/menu.routes'); // Cardápio (Categorias, Produtos)
const marketingRoutes = require('../features/Marketing/marketing.routes'); // Screensavers e Promoções
const dashboardRoutes = require('../features/Dashboard/dashboard.routes'); // Analytics do Gerente

// --- Operação (Tablet/Garçom) ---
const tableRoutes = require('../features/Table/table.routes'); // Mesas e Dispositivos
const orderRoutes = require('../features/Order/order.routes'); // Pedidos e Sessões
const notificationRoutes = require('../features/Notification/notification.routes'); // Chamar Garçom
const feedbackRoutes = require('../features/Feedback/feedback.routes'); // Avaliações

// ==============================================================================
// 2. ROTA DE HEALTH CHECK (Monitoramento)
// ==============================================================================
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'OrdenGo API is running smoothly 🚀',
    env: process.env.NODE_ENV,
    timestamp: new Date()
  });
});

// ==============================================================================
// 3. DEFINIÇÃO DOS ENDPOINTS (Mounting)
// ==============================================================================

// 🔐 Autenticação (Login Admin, Garçom e Tablet)
router.use('/auth', authRoutes);

// 👑 Super Admin (Painel do Dono do SaaS)
// Engloba: /admin/tenants, /admin/plans, /admin/finance, /admin/ads, etc.
router.use('/admin', superAdminRoutes);

// ⚙️ Configurações do Restaurante (Tenant)
router.use('/settings', restaurantRoutes);

// 👥 Gestão de Equipe
router.use('/team', userRoutes);

// 🍽️ Cardápio Digital
router.use('/menu', menuRoutes);

// 🪑 Mesas e QR Codes
router.use('/tables', tableRoutes);

// 📺 Marketing (Screensavers e Ads no Tablet)
router.use('/marketing', marketingRoutes);

// 📝 Pedidos e Sessões (Coração Operacional)
router.use('/orders', orderRoutes);

// 🔔 Notificações (Push para Garçons)
router.use('/notifications', notificationRoutes);

// ⭐ Feedback e Avaliações
router.use('/feedback', feedbackRoutes);

// 📊 Dashboard do Gerente (Métricas do Restaurante)
router.use('/dashboard', dashboardRoutes);

module.exports = router;