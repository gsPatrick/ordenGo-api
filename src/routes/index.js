const express = require('express');
const router = express.Router();

// ==============================================================================
// IMPORTAÇÃO DAS ROTAS DAS FEATURES
// ==============================================================================
const authRoutes = require('../features/Auth/auth.routes');
const superAdminRoutes = require('../features/SuperAdmin/superAdmin.routes');
const restaurantRoutes = require('../features/Restaurant/restaurant.routes');
const userRoutes = require('../features/User/user.routes');
const tableRoutes = require('../features/SuperAdmin/Table/table.routes');
const menuRoutes = require('../features/Menu/menu.routes');
const marketingRoutes = require('../features/Marketing/marketing.routes');
const orderRoutes = require('../features/Order/order.routes');
const notificationRoutes = require('../features/Notification/notification.routes');
const feedbackRoutes = require('../features/Feedback/feedback.routes');
const dashboardRoutes = require('../features/Dashboard/dashboard.routes');

// ==============================================================================
// ROTA DE HEALTH CHECK (Para verificar se a API está viva)
// ==============================================================================
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'OrdenGo API is running smoothly 🚀',
    timestamp: new Date()
  });
});

// ==============================================================================
// DEFINIÇÃO DOS ENDPOINTS (PREFIXOS)
// ==============================================================================

// 1. Autenticação (Login Admin e Garçom)
router.use('/auth', authRoutes);

// 2. Super Admin (Gestão de Tenants/Restaurantes)
router.use('/admin', superAdminRoutes);

// 3. Configurações do Restaurante (Aparência, Geral, Logo)
router.use('/settings', restaurantRoutes);

// 4. Gestão de Equipe (Garçons, Gerentes)
router.use('/team', userRoutes);

// 5. Mesas e QR Codes
router.use('/tables', tableRoutes);

// 6. Cardápio (Categorias, Produtos, Modificadores)
router.use('/menu', menuRoutes);

// 7. Marketing (Screensavers, Promoções)
router.use('/marketing', marketingRoutes);

// 8. Pedidos e Sessões (O Coração Operacional)
router.use('/orders', orderRoutes);

// 9. Notificações (Chamar Garçom, Pedir Conta)
router.use('/notifications', notificationRoutes);

// 10. Avaliações (Feedback do Cliente)
router.use('/feedback', feedbackRoutes);

// 11. Dashboards e Relatórios (Admin e SuperAdmin)
router.use('/dashboard', dashboardRoutes);

module.exports = router;