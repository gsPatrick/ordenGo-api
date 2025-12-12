const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Restaurant } = require('../../models');
const AppError = require('../../utils/AppError');
const { validate: isUuid } = require('uuid');

// Helper para assinar Token
const signToken = (id, role, restaurantId) => {
  // ALTERAÇÃO: Mudado de '1d' para '30d' como padrão
  return jwt.sign({ id, role, restaurantId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const isValidUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

exports.loginUser = async (email, password) => {
  if (!email || !password) {
    throw new AppError('Por favor, forneça email e senha.', 400);
  }

  const user = await User.findOne({
    where: { email },
    include: [{ model: Restaurant, required: true, attributes: ['id', 'isActive', 'isOnboardingCompleted', 'slug'] }]
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Credenciais incorretas.', 401);
  }

  if (!user.Restaurant.isActive) {
    throw new AppError('A conta deste restaurante está desativada.', 403);
  }

  const token = signToken(user.id, user.role, user.restaurantId);
  user.password = undefined;

  return { user, token };
};

exports.loginWaiterWithPin = async (pin, restaurantIdentifier) => {
  if (!pin || !restaurantIdentifier) {
    throw new AppError('PIN e Identificador do Restaurante são obrigatórios.', 400);
  }

  let targetRestaurantId = restaurantIdentifier;

  if (!isValidUUID(restaurantIdentifier)) {
    const restaurant = await Restaurant.findOne({ where: { slug: restaurantIdentifier } });

    if (!restaurant) {
      throw new AppError(`Restaurante '${restaurantIdentifier}' não encontrado.`, 404);
    }

    targetRestaurantId = restaurant.id;
  }

  const user = await User.findOne({
    where: {
      pin,
      restaurantId: targetRestaurantId,
      role: 'waiter'
    }
  });

  if (!user) {
    throw new AppError('PIN incorreto ou usuário não encontrado neste restaurante.', 401);
  }

  // Garçons também herdam a expiração de 30 dias (útil para tablets)
  const token = signToken(user.id, user.role, user.restaurantId);
  user.password = undefined;

  return { user, token };
};