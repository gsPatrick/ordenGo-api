const { AdImpression, AdCreative, Campaign, Restaurant, Table } = require('../../models');
const AppError = require('../../utils/AppError');

/**
 * Registra uma visualização de anúncio (Vinda do Tablet)
 */
exports.registerImpression = async (data) => {
  const { 
    campaignId, 
    creativeId, 
    restaurantId, 
    tableId // Pode vir o UUID da mesa ou Token
  } = data;

  // 1. Validações básicas (Fail fast)
  if (!campaignId || !creativeId || !restaurantId) {
    throw new AppError('Dados incompletos para registro de impressão.', 400);
  }

  // 2. Busca dados auxiliares (como Região do Restaurante para BI)
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) throw new AppError('Restaurante inválido.', 404);

  // 3. Resolver ID da Mesa (se enviado token ou uuid)
  let resolvedTableId = null;
  if (tableId) {
    // Tenta achar se é UUID direto ou busca pelo token se necessário
    // Assumindo que o front manda o UUID da mesa já resolvido na inicialização
    resolvedTableId = tableId; 
  }

  // 4. Registrar a Impressão (Log Detalhado)
  const impression = await AdImpression.create({
    campaignId,
    creativeId,
    restaurantId,
    tableId: resolvedTableId,
    regionId: restaurant.regionId || null, // Importante para relatórios regionais
    viewedAt: new Date()
  });

  // 5. Incrementar Contadores Rápidos (Para Dashboard em tempo real sem count(*))
  // Incrementa sem esperar a resposta (Fire & Forget otimizado)
  AdCreative.increment('viewsCount', { where: { id: creativeId } }).catch(err => console.error('Erro inc creative views', err));
  
  // Se quisermos contar no nível da campanha também (opcional, mas útil)
  // Campaign.increment('totalViews', ...); 

  return impression;
};

/**
 * Registra um Clique (Interação com o Banner)
 */
exports.registerClick = async (creativeId) => {
  await AdCreative.increment('clicksCount', { where: { id: creativeId } });
  return true;
};