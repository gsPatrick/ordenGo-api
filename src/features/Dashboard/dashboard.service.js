const { Op } = require('sequelize');
const { 
  Order, OrderItem, Product, Restaurant, User, Plan, sequelize 
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


// ============================================================
// 🌍 2. DASHBOARD DO SUPERADMIN (Para o Dono do SaaS)
// ============================================================

exports.getSaaSStats = async () => {
  // A. Métricas de Crescimento
  const totalRestaurants = await Restaurant.count();
  const activeRestaurants = await Restaurant.count({ where: { isActive: true } });

  // B. Distribuição de Planos (CORRIGIDO: Usa a tabela Plan)
  const planDistribution = await Restaurant.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('Restaurant.id')), 'count']
    ],
    include: [{
      model: Plan,
      attributes: ['name']
    }],
    group: ['Plan.id', 'Plan.name'],
    raw: true
  });

  // Formata o resultado para { 'Basic': 10, 'Premium': 5 }
  const formattedPlans = {};
  planDistribution.forEach(item => {
    const planName = item['Plan.name'] || 'Sem Plano';
    formattedPlans[planName] = Number(item.count);
  });

  // C. Volume Transacionado Global (GMV)
  const globalGMV = await Order.sum('total', {
    where: { status: { [Op.not]: 'cancelled' } }
  });

  // D. Novos restaurantes nos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const newTenantsLastMonth = await Restaurant.count({
    where: {
      createdAt: { [Op.gte]: thirtyDaysAgo }
    }
  });

  return {
    tenants: {
      total: totalRestaurants,
      active: activeRestaurants,
      inactive: totalRestaurants - activeRestaurants,
      newLast30Days: newTenantsLastMonth
    },
    financial: {
      globalGMV: globalGMV || 0
    },
    plans: formattedPlans
  };
};