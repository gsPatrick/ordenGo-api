const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Restaurant } = require('../../models');
const AppError = require('../../utils/AppError');

// Helper para assinar Token
const signToken = (id, role, restaurantId) => {
  return jwt.sign({ id, role, restaurantId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

// Login padrão (Email + Senha) - Para Gerentes e Admin
exports.loginUser = async (email, password) => {
  // 1. Verificar se email e senha foram enviados
  if (!email || !password) {
    throw new AppError('Por favor, forneça email e senha.', 400);
  }

  // 2. Buscar usuário e incluir dados do Restaurante para verificar se está ativo
  const user = await User.findOne({ 
    where: { email },
    include: [{ model: Restaurant, required: true }] // required: true garante que só traz se tiver restaurante
  });

  // 3. Verificar se usuário existe e senha está correta
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Credenciais incorretas.', 401);
  }

  // 4. Verificar se o restaurante está ativo (Bloqueio por falta de pagamento, etc)
  if (!user.Restaurant.isActive) {
    throw new AppError('A conta deste restaurante está desativada. Contate o suporte.', 403);
  }

  // 5. Gerar Token
  const token = signToken(user.id, user.role, user.restaurantId);

  // Remover senha do objeto de retorno
  user.password = undefined;

  return { user, token };
};

// Login simplificado para Garçons (PIN)
exports.loginWaiterWithPin = async (pin, restaurantId) => {
  // Garçons logam com PIN, mas precisamos saber de QUAL restaurante eles são.
  // Geralmente, o tablet já tem o restaurantId configurado ou é passado na URL.
  
  if (!pin || !restaurantId) {
    throw new AppError('PIN e ID do Restaurante são obrigatórios.', 400);
  }

  const user = await User.findOne({
    where: { 
      pin, 
      restaurantId,
      role: 'waiter' // Segurança extra: PIN só serve para garçom
    }
  });

  if (!user) {
    throw new AppError('PIN inválido.', 401);
  }

  const token = signToken(user.id, user.role, user.restaurantId);
  user.password = undefined; // Garante segurança

  return { user, token };
};