const { Region } = require('../../models');
const cityProvider = require('../../utils/cityProvider');
const AppError = require('../../utils/AppError');

/**
 * Cria uma nova Região (Agrupamento geográfico para Ads)
 */
exports.createRegion = async (data) => {
  // data = { name: "Zona Sul - Tenerife", country: "ES", description: "..." }
  return await Region.create(data);
};

/**
 * Lista todas as regiões cadastradas
 */
exports.listRegions = async () => {
  return await Region.findAll({
    order: [['country', 'ASC'], ['name', 'ASC']]
  });
};

/**
 * Atualiza uma região
 */
exports.updateRegion = async (id, data) => {
  const region = await Region.findByPk(id);
  if (!region) throw new AppError('Região não encontrada.', 404);

  await region.update(data);
  return region;
};

/**
 * Remove uma região
 */
exports.deleteRegion = async (id) => {
  const region = await Region.findByPk(id);
  if (!region) throw new AppError('Região não encontrada.', 404);
  
  // TODO: Futuramente verificar se existem Campanhas ou Restaurantes vinculados antes de deletar
  // Por enquanto, deletamos direto.
  await region.destroy();
};

/**
 * Proxy para buscar cidades reais da API externa
 * Útil para preencher dropdowns no Frontend sem expor a API externa diretamente
 */
exports.getCitiesForCountry = async (countryCode) => {
  if (!countryCode) throw new AppError('Código do país é obrigatório (ex: ES, DE, IT).', 400);
  
  const cities = await cityProvider.fetchCitiesByCountry(countryCode);
  return cities;
};