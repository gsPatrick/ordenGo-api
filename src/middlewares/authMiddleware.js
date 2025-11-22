const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { User, Restaurant } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Buscar o token e verificar se ele existe
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Você não está logado. Por favor, faça login.', 401));
  }

  // 2. Verificar se o token é válido (Assinatura e Expiração)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Verificar se o usuário ainda existe (pode ter sido deletado ou demitido)
  const currentUser = await User.findByPk(decoded.id);
  if (!currentUser) {
    return next(new AppError('O usuário dono deste token não existe mais.', 401));
  }

  // 4. Verificar se o restaurante ainda está ativo
  // (Opcional: Se quiser economizar query, confie no token, mas é mais seguro checar o banco)
  /* 
  const restaurant = await Restaurant.findByPk(decoded.restaurantId);
  if (!restaurant || !restaurant.isActive) {
      return next(new AppError('A conta deste restaurante está suspensa.', 403));
  }
  */

  // 5. CONCEDER ACESSO E DEFINIR CONTEXTO
  req.user = currentUser;
  req.restaurantId = decoded.restaurantId; // Facilita muito nas queries futuras: where: { restaurantId: req.restaurantId }
  
  next();
});

// Middleware para restringir acesso por Cargo (Role)
// Exemplo de uso nas rotas: restrictTo('manager', 'admin')
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Você não tem permissão para realizar esta ação.', 403));
    }
    next();
  };
};