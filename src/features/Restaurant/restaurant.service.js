const { Restaurant, RestaurantConfig } = require('../../models');
const AppError = require('../../utils/AppError');

/**
 * Busca todas as configurações do restaurante logado.
 * Retorna dados unidos (Info Básica + Config Visual)
 */
exports.getRestaurantSettings = async (restaurantId) => {
  const restaurant = await Restaurant.findByPk(restaurantId, {
    include: [{ 
      model: RestaurantConfig, 
      as: 'config' 
    }]
  });

  if (!restaurant) {
    throw new AppError('Restaurante não encontrado.', 404);
  }

  return restaurant;
};

/**
 * Atualiza as configurações visuais e funcionais (Apperance & Settings)
 * Campos: Cores, Wifi, Textos Sobre, Toggles de Funcionalidade
 */
exports.updateConfig = async (restaurantId, data) => {
  const config = await RestaurantConfig.findOne({ where: { restaurantId } });

  if (!config) {
    // Teoricamente o SuperAdmin cria isso, mas por segurança...
    throw new AppError('Configuração não encontrada para este restaurante.', 404);
  }

  // Atualiza apenas os campos permitidos
  const allowedFields = [
    'primaryColor', 'secondaryColor', 'backgroundColor',
    'aboutTitle', 'aboutText',
    'wifiSsid', 'wifiPassword',
    'enableCallWaiter', 'enableBillRequest'
  ];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) config[field] = data[field];
  });

  await config.save();
  return config;
};

/**
 * Atualiza dados cadastrais (Geral)
 * Campos: Nome, Moeda, Idiomas
 */
exports.updateGeneralInfo = async (restaurantId, data) => {
  const restaurant = await Restaurant.findByPk(restaurantId);

  if (data.name) restaurant.name = data.name;
  if (data.currency) restaurant.currency = data.currency; // BRL, USD
  if (data.locales) restaurant.locales = data.locales; // ['pt-BR', 'en-US']

  await restaurant.save();
  return restaurant;
};

/**
 * Salva a URL do logo após o upload
 */
exports.updateLogo = async (restaurantId, filename) => {
  const config = await RestaurantConfig.findOne({ where: { restaurantId } });
  
  // Constrói a URL relativa (frontend deve adicionar o dominio base)
  config.logoUrl = `/uploads/${filename}`;
  await config.save();

  return config.logoUrl;
};

/**
 * Marca o onboarding como concluído
 */
exports.completeOnboarding = async (restaurantId) => {
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) {
    throw new AppError('Restaurante não encontrado.', 404);
  }

  restaurant.isOnboardingCompleted = true;
  await restaurant.save();

  return restaurant;
};