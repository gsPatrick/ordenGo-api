const { Op } = require('sequelize');
const { 
  Order, OrderItem, Product, Restaurant, User, sequelize 
} = require('../../models');

// ============================================================
// 📊 1. DASHBOARD DO RESTAURANTE (Para o Gerente)
// ============================================================

exports.getRestaurantStats = async (restaurantId, startDate, endDate) => {
  // Filtro de data básico (se não vier, pega as últimas 24h)
  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
  const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23,59,59,999));

  const dateFilter = {
    restaurantId,
    createdAt: { [Op.between]: [start, end] },
    status: { [Op.not]: 'cancelled' } // Ignora cancelados
  };

  // A. Cards de Resumo (Total Vendido, Qtde Pedidos, Ticket Médio)
  const totalSales = await Order.sum('total', { where: dateFilter }) || 0;
  const totalOrders = await Order.count({ where: dateFilter });
  const averageTicket = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0;

  // B. Gráfico: Vendas por Hora (Para identificar picos)
  // Usamos funcão do Postgres: date_trunc('hour', ...)
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

  // C. Ranking: Top 5 Produtos Mais Vendidos
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
        where: { restaurantId } // Garante segurança
      },
      {
        model: Order,
        attributes: [],
        where: dateFilter // Aplica o filtro de data nos itens tbm
      }
    ],
    group: ['productId', 'Product.id'],
    order: [[sequelize.col('soldQuantity'), 'DESC']],
    limit: 5
  });

  return {
    summary: {
      totalSales,
      totalOrders,
      averageTicket
    },
    charts: {
      salesByHour: salesByHour.map(item => ({
        hour: item.hour, // Frontend formata isso (ex: "14:00")
        total: Number(item.total),
        count: Number(item.count)
      }))
    },
    ranking: topProducts.map(item => ({
      name: item.Product.name,
      quantity: Number(item.getDataValue('soldQuantity')),
      revenue: Number(item.getDataValue('revenue'))
    }))
  };
};


// ============================================================
// 🌍 2. DASHBOARD DO SUPERADMIN (Para o Dono do SaaS)
// ============================================================

exports.getSaaSStats = async () => {
  // A. Métricas de Crescimento (Total de Tenants)
  const totalRestaurants = await Restaurant.count();
  const activeRestaurants = await Restaurant.count({ where: { isActive: true } });

  // B. Distribuição de Planos
  const planDistribution = await Restaurant.findAll({
    attributes: ['planType', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['planType'],
    raw: true
  });

  // C. Volume Transacionado Global (GMV) - Opcional, pode ser pesado
  // Soma de todas as ordens de todos os restaurantes
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
    plans: planDistribution.reduce((acc, item) => {
      acc[item.planType] = Number(item.count);
      return acc;
    }, {})
  };
};