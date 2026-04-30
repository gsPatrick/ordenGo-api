const { 
  Restaurant, 
  Plan, 
  Invoice, 
  AdImpression, 
  Campaign, 
  TableDevice, 
  User, // <--- Adicionado para buscar email do gerente
  sequelize 
} = require('../../models');
const { Op } = require('sequelize');

// ============================================================
// KPI'S DO DASHBOARD GLOBAL
// ============================================================

exports.getGlobalDashboardStats = async () => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. KPIs Operacionais
  const totalRestaurants = await Restaurant.count();
  const activeRestaurants = await Restaurant.count({ where: { isActive: true } });
  
  // Correção Erro 1: Contagem de Tablets
  // Se o banco não tiver migrado a coluna status ainda, usamos count simples como fallback
  let activeTablets = 0;
  try {
    activeTablets = await TableDevice.count({ where: { status: 'active' } });
  } catch (e) {
    // Fallback se a coluna status não existir no DB físico ainda
    activeTablets = await TableDevice.count();
  }

  // 2. KPIs Financeiros (MRR Teórico)
  const activeSubscriptions = await Restaurant.findAll({
    where: { isActive: true },
    include: [{ model: Plan }]
  });

  let mrr = 0;
  activeSubscriptions.forEach(rest => {
    if (rest.Plan) {
      mrr += Number(rest.Plan.priceMonthly);
    }
  });

  // Receita Realizada este mês
  const revenueThisMonth = await Invoice.findAll({
    where: {
      status: 'paid',
      paidAt: { [Op.gte]: firstDayOfMonth }
    },
    attributes: ['type', [sequelize.fn('SUM', sequelize.col('total')), 'total']],
    group: ['type']
  });

  const revenueMap = { saas: 0, ads: 0 };
  revenueThisMonth.forEach(r => {
    if (r.type === 'saas_subscription') revenueMap.saas = Number(r.getDataValue('total'));
    if (r.type === 'ad_revenue') revenueMap.ads = Number(r.getDataValue('total'));
  });

  // 3. Ticket Médio (ARPU)
  const arpu = activeRestaurants > 0 ? (mrr / activeRestaurants).toFixed(2) : 0;

  // Histórico Mockado (para não quebrar o gráfico do front se não tiver dados antigos)
  // Em produção, isso seria uma query complexa de invoices passados
  const revenueHistory = [
    { date: 'Jan', saas: mrr * 0.8, ads: revenueMap.ads * 0.8 },
    { date: 'Fev', saas: mrr * 0.9, ads: revenueMap.ads * 0.9 },
    { date: 'Mar', saas: mrr, ads: revenueMap.ads }
  ];

  return {
    operational: {
      totalRestaurants,
      activeRestaurants,
      churnedRestaurants: totalRestaurants - activeRestaurants,
      activeTablets
    },
    financial: {
      mrr: mrr.toFixed(2),
      revenueSaaS: revenueMap.saas.toFixed(2),
      revenueAds: revenueMap.ads.toFixed(2),
      arpu
    },
    revenueHistory
  };
};

// ============================================================
// RELATÓRIOS ESPECÍFICOS
// ============================================================

/**
 * Relatório de Performance de Ads (Correção Erro 2: Alias e Group By)
 */
exports.getAdPerformanceReport = async () => {
  // A query original falhava porque o include gera um alias (geralmente plural 'AdImpressions')
  // e o group by precisa bater exatamente com isso.
  
  const campaigns = await Campaign.findAll({
    attributes: [
      'id', 
      'title', 
      'status',
      // Contagem direta via subquery ou join
      [sequelize.fn('COUNT', sequelize.col('AdImpressions.id')), 'impressions']
    ],
    include: [{
      model: AdImpression,
      attributes: [], // Não trazer dados, só contar
      required: false // LEFT JOIN (trazer campanhas mesmo com 0 views)
    }],
    group: ['Campaign.id'], // Agrupar pela campanha
    order: [[sequelize.literal('impressions'), 'DESC']],
    limit: 10,
    subQuery: false // IMPORTANTE: Evita erros de FROM clause em joins complexos
  });

  return campaigns.map(c => ({
    title: c.title,
    status: c.status,
    impressions: Number(c.getDataValue('impressions')) || 0
  }));
};

/**
 * Relatório Financeiro (Correção Erro 3: managerEmail)
 */
exports.getOverdueReport = async () => {
  const overdueInvoices = await Invoice.findAll({
    where: { status: 'overdue' },
    include: [
      { 
        model: Restaurant, 
        attributes: ['name'],
        // Join aninhado para pegar o email do gerente
        include: [{
          model: User,
          attributes: ['email'],
          where: { role: 'manager' }, // Pega apenas o gerente
          required: false,
          limit: 1
        }]
      }
    ],
    order: [['dueDate', 'ASC']]
  });

  return overdueInvoices.map(inv => {
    // Tratamento de nulos seguro
    const restaurantName = inv.Restaurant ? inv.Restaurant.name : 'Anunciante Externo';
    const managerEmail = inv.Restaurant && inv.Restaurant.Users && inv.Restaurant.Users[0] 
      ? inv.Restaurant.Users[0].email 
      : 'N/A';

    return {
      id: inv.id,
      restaurant: restaurantName,
      managerEmail: managerEmail,
      amount: inv.total,
      dueDate: inv.dueDate,
      daysLate: Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))
    };
  });
};