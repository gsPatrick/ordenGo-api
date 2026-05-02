const { Op } = require('sequelize');
const { 
  Order, OrderItem, Product, Restaurant, User, Plan, Review, Ticket, sequelize 
} = require('../../models');

// ============================================================
// 📊 1. DASHBOARD DO RESTAURANTE (Para o Gerente)
// ============================================================

exports.getRestaurantStats = async (restaurantId, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
  const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23,59,59,999));

  const dateFilter = {
    restaurantId,
    createdAt: { [Op.between]: [start, end] },
    status: { [Op.not]: 'cancelled' }
  };

  const totalSales = await Order.sum('total', { where: dateFilter }) || 0;
  const totalOrders = await Order.count({ where: dateFilter });
  const averageTicket = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0;

  const salesByHour = await Order.findAll({
    attributes: [
      [sequelize.fn('date_trunc', 'hour', sequelize.col('createdAt')), 'hour'],
      [sequelize.fn('SUM', sequelize.col('total')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: dateFilter,
    group: [sequelize.fn('date_trunc', 'hour', sequelize.col('createdAt'))],
    order: [[sequelize.col('hour'), 'ASC']],
    raw: true
  });

  const topProducts = await OrderItem.findAll({
    attributes: [
      'productId',
      [sequelize.fn('SUM', sequelize.col('quantity')), 'soldQuantity'],
      [sequelize.fn('SUM', sequelize.col('totalPrice')), 'revenue']
    ],
    include: [
      { 
        model: Product, 
        attributes: ['name'],
        where: { restaurantId }
      },
      {
        model: Order,
        attributes: [],
        where: dateFilter
      }
    ],
    group: ['productId', 'Product.id', 'Product.name'], // Group by corrigido para Postgres
    order: [[sequelize.col('soldQuantity'), 'DESC']],
    limit: 5
  });

  return {
    summary: { totalSales, totalOrders, averageTicket },
    charts: {
      salesByHour: salesByHour.map(item => ({
        hour: item.hour,
        total: Number(item.total),
        count: Number(item.count)
      }))
    },
    ranking: topProducts.map(item => ({
      name: item.Product.name, // Agora acessível com segurança
      quantity: Number(item.getDataValue('soldQuantity')),
      revenue: Number(item.getDataValue('revenue'))
    }))
  };
};

exports.getAdvancedStats = async (restaurantId, startDate, endDate, periodType) => {
  // 1. Definir Período Atual
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // 2. Definir Período Anterior (Para comparação)
  const duration = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - duration);
  const prevEnd = new Date(end.getTime() - duration);

  const currentFilter = {
    restaurantId,
    createdAt: { [Op.between]: [start, end] },
    status: { [Op.not]: 'cancelled' }
  };

  const prevFilter = {
    restaurantId,
    createdAt: { [Op.between]: [prevStart, prevEnd] },
    status: { [Op.not]: 'cancelled' }
  };

  // --- A. TOTAIS (Cards) ---
  const currentSales = await Order.sum('total', { where: currentFilter }) || 0;
  const prevSales = await Order.sum('total', { where: prevFilter }) || 0;
  
  const currentOrders = await Order.count({ where: currentFilter });
  const prevOrders = await Order.count({ where: prevFilter });

  // --- B. GRÁFICOS DE LINHA (Sales over time) ---
  // Agrupamento depende do intervalo (se é 1 dia, agrupa por hora; se é mês, por dia)
  let truncUnit = 'day';
  if (periodType === 'daily') truncUnit = 'hour';
  if (periodType === 'yearly') truncUnit = 'month';

  const salesChart = await Order.findAll({
    attributes: [
      [sequelize.fn('date_trunc', truncUnit, sequelize.col('createdAt')), 'date'],
      [sequelize.fn('SUM', sequelize.col('total')), 'total'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    where: currentFilter,
    group: [sequelize.fn('date_trunc', truncUnit, sequelize.col('createdAt'))],
    order: [[sequelize.col('date'), 'ASC']],
    raw: true
  });

  // --- C. FEEDBACK ---
  const reviews = await Review.findAll({
    where: { 
      restaurantId,
      createdAt: { [Op.between]: [start, end] }
    },
    attributes: ['ratingGlobal']
  });
  
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.ratingGlobal, 0) / reviews.length).toFixed(1) 
    : 0;

  // --- D. PRODUTOS MAIS VENDIDOS ---
  const topProducts = await OrderItem.findAll({
    attributes: [
      'productId',
      [sequelize.fn('SUM', sequelize.col('quantity')), 'soldQuantity']
    ],
    include: [
      { 
        model: Product, 
        attributes: ['name'],
        where: { restaurantId }
      },
      {
        model: Order,
        attributes: [],
        where: currentFilter
      }
    ],
    group: ['productId', 'Product.id', 'Product.name'],
    order: [[sequelize.col('soldQuantity'), 'DESC']],
    limit: 10
  });

  return {
    cards: {
      sales: { current: currentSales, previous: prevSales },
      orders: { current: currentOrders, previous: prevOrders },
      ticket: { 
        current: currentOrders > 0 ? currentSales / currentOrders : 0,
        previous: prevOrders > 0 ? prevSales / prevOrders : 0
      }
    },
    charts: {
      salesOverTime: salesChart.map(s => ({
        label: s.date,
        value: Number(s.total),
        count: Number(s.count)
      }))
    },
    feedback: {
      average: avgRating,
      total: reviews.length
    },
    ranking: topProducts.map(p => ({
      name: p.Product.name,
      quantity: Number(p.getDataValue('soldQuantity'))
    }))
  };
};


// ============================================================
// 🌍 2. DASHBOARD DO SUPERADMIN (Para o Dono do SaaS)
// ============================================================

exports.getSaaSStats = async () => {
  // A. Métricas de Crescimento
  const totalRestaurants = await Restaurant.count();
  const activeRestaurants = await Restaurant.count({ where: { isActive: true } });
  const suspendedRestaurants = await Restaurant.count({ where: { isActive: false } });

  // B. Cálculo de MRR (Monthly Recurring Revenue)
  // Buscamos todos os restaurantes ativos e seus respectivos planos
  const activeSubscriptions = await Restaurant.findAll({
    where: { isActive: true },
    include: [{
      model: Plan,
      attributes: ['name', 'priceMonthly', 'priceYearly']
    }]
  });

  let mrr = 0;
  const planDistribution = {};

  activeSubscriptions.forEach(res => {
    const plan = res.Plan;
    if (plan) {
      // Cálculo: Mensal + (Anual / 12) - Assumindo que o restaurante está em um dos dois
      // Se houver ambos, priorizamos mensal para o cálculo de fluxo recorrente
      const monthlyContribution = Number(plan.priceMonthly) || (Number(plan.priceYearly) / 12) || 0;
      mrr += monthlyContribution;

      planDistribution[plan.name] = (planDistribution[plan.name] || 0) + 1;
    }
  });

  // C. Volume Transacionado Global (GMV) - Apenas pedidos não cancelados
  const globalGMV = await Order.sum('total', {
    where: { status: { [Op.not]: ['cancelled', 'pending'] } }
  });

  // D. Novos restaurantes nos últimos 30 dias (Growth)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const newTenantsLastMonth = await Restaurant.count({
    where: {
      createdAt: { [Op.gte]: thirtyDaysAgo }
    }
  });

  // E. Tickets de Suporte (Help Desk Load)
  const ticketsByStatus = await Ticket.findAll({
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status'],
    raw: true
  });

  const formattedTickets = { open: 0, in_progress: 0, closed: 0 };
  ticketsByStatus.forEach(t => {
    formattedTickets[t.status] = Number(t.count);
  });

  return {
    tenants: {
      total: totalRestaurants,
      active: activeRestaurants,
      suspended: suspendedRestaurants,
      newLast30Days: newTenantsLastMonth
    },
    financial: {
      globalGMV: globalGMV || 0,
      mrr: Math.round(mrr * 100) / 100 // Arredonda para 2 casas
    },
    tickets: formattedTickets,
    plans: planDistribution
  };
};