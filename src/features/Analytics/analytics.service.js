const { 
  Restaurant, 
  Plan, 
  Invoice, 
  AdImpression, 
  Campaign, 
  TableDevice, 
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
  
  // Total de Tablets Conectados (Global)
  // Se usar o model TableDevice novo:
  const activeTablets = await TableDevice.count({ where: { status: 'active' } });
  // Se ainda usar o campo na Table antiga:
  // const activeTablets = await Table.count({ where: { isDeviceConnected: true } });

  // 2. KPIs Financeiros (MRR Teórico - Soma dos contratos ativos)
  // Melhor que somar faturas, pois prevê o mês atual
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

  // Receita Realizada este mês (SaaS + Ads)
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

  return {
    operational: {
      totalRestaurants,
      activeRestaurants,
      churnedRestaurants: totalRestaurants - activeRestaurants,
      activeTablets
    },
    financial: {
      mrr: mrr.toFixed(2), // Previsão recorrente
      revenueSaaS: revenueMap.saas.toFixed(2), // O que entrou no caixa
      revenueAds: revenueMap.ads.toFixed(2),
      arpu // Average Revenue Per User (Tenant)
    }
  };
};

// ============================================================
// RELATÓRIOS ESPECÍFICOS (ABAS DO MENU)
// ============================================================

/**
 * Relatório de Performance de Ads (Impressões por Campanha)
 */
exports.getAdPerformanceReport = async () => {
  // Top 10 Campanhas por Impressões
  const campaigns = await Campaign.findAll({
    attributes: ['id', 'title', 'status'],
    include: [{
      model: AdImpression,
      attributes: [] // Apenas count
    }],
    attributes: {
      include: [
        [sequelize.fn('COUNT', sequelize.col('AdImpressions.id')), 'impressions']
      ]
    },
    group: ['Campaign.id'],
    order: [[sequelize.literal('impressions'), 'DESC']],
    limit: 10
  });

  return campaigns.map(c => ({
    title: c.title,
    status: c.status,
    impressions: Number(c.getDataValue('impressions'))
  }));
};

/**
 * Relatório Financeiro (Inadimplência)
 */
exports.getOverdueReport = async () => {
  const overdueInvoices = await Invoice.findAll({
    where: { status: 'overdue' },
    include: [{ model: Restaurant, attributes: ['name', 'managerEmail'] }],
    order: [['dueDate', 'ASC']] // Mais antigos primeiro
  });

  return overdueInvoices.map(inv => ({
    id: inv.id,
    restaurant: inv.Restaurant ? inv.Restaurant.name : 'Anunciante Externo',
    amount: inv.total,
    dueDate: inv.dueDate,
    daysLate: Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))
  }));
};