const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Restaurant } = require('../../models'); // Importamos Restaurant
const AppError = require('../../utils/AppError');
const { validate: isUuid } = require('uuid'); // Ou usaremos Regex se não tiver uuid instalado

// Helper para assinar Token
const signToken = (id, role, restaurantId) => {
  return jwt.sign({ id, role, restaurantId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

// Função auxiliar para verificar UUID v4
const isValidUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

// Login padrão (Email + Senha)
exports.loginUser = async (email, password) => {
  if (!email || !password) {
    throw new AppError('Por favor, forneça email e senha.', 400);
  }

const user = await User.findOne({ 
  where: { email },
  // Certifique-se de incluir isOnboardingCompleted
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

// Login simplificado para Garçons (PIN)
exports.loginWaiterWithPin = async (pin, restaurantIdentifier) => {
  if (!pin || !restaurantIdentifier) {
    throw new AppError('PIN e Identificador do Restaurante são obrigatórios.', 400);
  }

  let targetRestaurantId = restaurantIdentifier;

  // CORREÇÃO DO ERRO:
  // Verifica se o "restaurantIdentifier" NÃO é um UUID válido.
  // Se for "patrick", por exemplo, ele entra no IF.
  if (!isValidUUID(restaurantIdentifier)) {
    // Assume que é um SLUG e busca o ID real
    const restaurant = await Restaurant.findOne({ where: { slug: restaurantIdentifier } });
    
    if (!restaurant) {
      throw new AppError(`Restaurante '${restaurantIdentifier}' não encontrado.`, 404);
    }
    
    targetRestaurantId = restaurant.id; // Pega o UUID correto (ex: 550e8400-e29b...)
  }

  // Agora busca o usuário usando o UUID correto
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

  const token = signToken(user.id, user.role, user.restaurantId);
  user.password = undefined;

  return { user, token };
};