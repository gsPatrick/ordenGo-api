const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { User, Restaurant } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Middleware para proteger rotas.
 * Verifica se o token JWT é válido e se o usuário existe.
 */
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Buscar o token no header Authorization
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Você não está logado. Por favor, faça login para acessar.', 401));
  }

  // 2. Verificar se o token é válido (Assinatura e Expiração)
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Verificar se o usuário dono do token ainda existe
  const currentUser = await User.findByPk(decoded.id, {
    include: [
      { 
        model: Restaurant, 
        attributes: ['id', 'isActive', 'name'] // Trazemos o status do restaurante
      }
    ]
  });

  if (!currentUser) {
    return next(new AppError('O usuário deste token não existe mais.', 401));
  }

  // 4. Verificações de Segurança Específicas

  // A. Se for um usuário de Restaurante (Garçom/Gerente), verifica se o Restaurante está ATIVO
  // (Superadmin e equipe interna têm restaurantId = null, então pulam essa checagem)
  if (currentUser.restaurantId && currentUser.Restaurant) {
    if (!currentUser.Restaurant.isActive) {
      return next(new AppError('A conta deste restaurante foi suspensa. Contate o suporte.', 403));
    }
  }

  // B. (Opcional) Verificar se a senha mudou depois que o token foi emitido
  // if (currentUser.changedPasswordAfter(decoded.iat)) { ... }

  // 5. CONCEDER ACESSO E INJETAR DADOS NA REQUISIÇÃO
  req.user = currentUser;
  
  // Facilita o acesso ao ID do restaurante nas controllers
  // Se for superadmin, isso será null (correto)
  req.restaurantId = currentUser.restaurantId; 
  
  next();
});

/**
 * Middleware para restringir acesso por Cargo (Role).
 * Exemplo de uso: restrictTo('superadmin', 'admin_finance')
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user foi populado pelo middleware 'protect' anterior
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Você não tem permissão para realizar esta ação.', 403));
    }
    next();
  };
};