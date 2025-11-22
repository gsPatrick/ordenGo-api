const { Review, Table, TableSession, sequelize } = require('../../models');
const AppError = require('../../utils/AppError');

/**
 * Cria uma nova avaliação vinda do Tablet
 */
exports.createReview = async (restaurantId, data) => {
  const { tableSessionId, ratingGlobal, ratings, comment, contactInfo, clientName } = data;

  // Tentamos descobrir a mesa através da sessão
  let tableId = null;
  if (tableSessionId) {
    const session = await TableSession.findByPk(tableSessionId);
    if (session) tableId = session.tableId;
  }

  const review = await Review.create({
    restaurantId,
    tableId,
    tableSessionId,
    clientName, // Pode vir do form de avaliação ou da sessão
    ratingGlobal,
    ratings, // JSONB
    comment,
    contactInfo
  });

  return review;
};

/**
 * Gera o Resumo (Dashboard de Notas)
 * Retorna: Média Geral + Média por Categoria (Comida, Serviço, etc)
 */
exports.getFeedbackSummary = async (restaurantId) => {
  // Busca todas as reviews do restaurante
  const reviews = await Review.findAll({
    where: { restaurantId },
    attributes: ['ratingGlobal', 'ratings']
  });

  if (reviews.length === 0) {
    return {
      totalReviews: 0,
      averageGlobal: 0,
      averageByCategory: {}
    };
  }

  // 1. Média Global
  const totalSum = reviews.reduce((sum, r) => sum + r.ratingGlobal, 0);
  const averageGlobal = (totalSum / reviews.length).toFixed(1);

  // 2. Média por Categoria (Processamento de JSONB via JS)
  // ratings ex: { food: 5, service: 4 }
  const categorySums = {};
  const categoryCounts = {};

  reviews.forEach(r => {
    if (r.ratings) {
      Object.keys(r.ratings).forEach(key => {
        const val = Number(r.ratings[key]);
        if (!categorySums[key]) {
          categorySums[key] = 0;
          categoryCounts[key] = 0;
        }
        categorySums[key] += val;
        categoryCounts[key] += 1;
      });
    }
  });

  const averageByCategory = {};
  Object.keys(categorySums).forEach(key => {
    averageByCategory[key] = (categorySums[key] / categoryCounts[key]).toFixed(1);
  });

  return {
    totalReviews: reviews.length,
    averageGlobal,
    averageByCategory // { food: "4.5", service: "4.8", ambience: "5.0" }
  };
};

/**
 * Lista Comentários (Cronológico)
 */
exports.getReviewsList = async (restaurantId, limit = 50) => {
  return await Review.findAll({
    where: { restaurantId },
    include: [
      { model: Table, attributes: ['number'] } // Para saber "Mesa 01"
    ],
    order: [['createdAt', 'DESC']],
    limit
  });
};