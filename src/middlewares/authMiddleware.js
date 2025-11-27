const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { User, Restaurant } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Middleware para proteger rotas.
 * Verifica se o token JWT é válido, se o usuário existe e injeta dados no req.
 */
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // 1. Buscar o token no header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('Você não está logado. Por favor, faça login para acessar.', 401)
    );
  }

  // 2. Verificar assinatura e expiração do token
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  // 3. Verificar se o usuário existe
  const currentUser = await User.findByPk(decoded.id, {
    include: [
      {
        model: Restaurant,
        attributes: ['id', 'isActive', 'name']
      }
    ]
  });

  if (!currentUser) {
    return next(
      new AppError('O usuário deste token não existe mais.', 401)
    );
  }

  // 4. Verificações específicas

  /**
   * A. Usuários comuns (garçom/gerente/etc) têm restaurantId != null.
   * Superadmin e equipe interna têm restaurantId = null → IGNORAR validação de restaurante.
   */
  const isSuperAdmin = currentUser.role === 'superadmin';

  if (!isSuperAdmin && currentUser.restaurantId) {
    // Se for usuário vinculado a restaurante, validar se o restaurante está ativo.
    if (currentUser.Restaurant && !currentUser.Restaurant.isActive) {
      return next(
        new AppError(
          'A conta deste restaurante foi suspensa. Contate o suporte.',
          403
        )
      );
    }
  }

  // 5. Injetar dados na requisição
  req.user = currentUser;

  /**
   * Adicionar o restaurantId:
   * - Superadmin → null (correto)
   * - Usuário comum → id do restaurante
   */
  req.restaurantId = isSuperAdmin ? null : currentUser.restaurantId;

  next();
});

/**
 * Middleware para restringir acesso por Cargo (Role).
 * Exemplo: restrictTo('superadmin', 'admin_finance')
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'Você não tem permissão para realizar esta ação.',
          403
        )
      );
    }
    next();
  };
};
