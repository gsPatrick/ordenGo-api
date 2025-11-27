const { Plan, Restaurant } = require('../../models');
const AppError = require('../../utils/AppError');

/**
 * Cria um novo Plano SaaS
 */
exports.createPlan = async (data) => {
  // data espera: name, priceMonthly, priceYearly, maxTablets, features, currency
  const plan = await Plan.create({
    name: data.name,
    priceMonthly: data.priceMonthly || 0,
    priceYearly: data.priceYearly || 0,
    currency: data.currency || 'EUR', // Padrão Europa
    maxTablets: data.maxTablets || 5,
    features: data.features || {}, // Ex: { removeAds: true, support: 'priority' }
    isActive: true
  });
  
  return plan;
};

/**
 * Lista todos os planos (Admin vê todos, incluindo inativos/arquivados)
 */
exports.getAllPlans = async (onlyActive = false) => {
  const where = {};
  if (onlyActive) {
    where.isActive = true;
  }
  
  return await Plan.findAll({
    where,
    order: [['priceMonthly', 'ASC']] // Ordenar do mais barato para o mais caro
  });
};

/**
 * Busca um plano pelo ID
 */
exports.getPlanById = async (id) => {
  const plan = await Plan.findByPk(id);
  if (!plan) throw new AppError('Plano não encontrado.', 404);
  return plan;
};

/**
 * Atualiza dados do plano
 */
exports.updatePlan = async (id, data) => {
  const plan = await Plan.findByPk(id);
  if (!plan) throw new AppError('Plano não encontrado.', 404);

  // Proteção: Se campos críticos mudarem, isso não afeta contratos vigentes automaticamente
  // (Lógica de renovação lidará com novos preços na próxima fatura)
  
  await plan.update(data);
  return plan;
};

/**
 * Ativa/Desativa um plano (Soft Delete)
 * Não deletamos fisicamente para não quebrar histórico financeiro de quem já assinou.
 */
exports.togglePlanStatus = async (id) => {
  const plan = await Plan.findByPk(id);
  if (!plan) throw new AppError('Plano não encontrado.', 404);

  plan.isActive = !plan.isActive;
  await plan.save();

  return plan;
};

/**
 * Verifica quantos restaurantes estão usando este plano
 */
exports.countUsage = async (id) => {
  const count = await Restaurant.count({ where: { planId: id } });
  return count;
};
