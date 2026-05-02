const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { User, Restaurant, Role, Permission } = require('../models');
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

  // 3. Verificar se o usuário existe (Com Role e Permissões)
  const currentUser = await User.findByPk(decoded.id, {
    include: [
      {
        model: Restaurant,
        attributes: ['id', 'isActive', 'name']
      },
      {
        model: Role,
        as: 'userRole',
        include: [{ model: Permission }]
      }
    ]
  });

  if (!currentUser) {
    return next(
      new AppError('O usuário deste token não existe mais.', 401)
    );
  }

  // 4. Verificações específicas
  const isSuperAdmin = currentUser.role === 'superadmin';

  if (!isSuperAdmin && currentUser.restaurantId) {
    if (currentUser.Restaurant && !currentUser.Restaurant.isActive) {
      return next(
        new AppError('A conta deste restaurante foi suspensa. Contate o suporte.', 403)
      );
    }
  }

  // 5. Injetar dados na requisição
  req.permissions = currentUser.userRole?.Permissions?.map(p => p.slug) || [];
  req.user = currentUser;
  req.restaurantId = isSuperAdmin ? null : currentUser.restaurantId;

  next();
});

/**
 * Middleware para restringir acesso (RBAC Híbrido).
 * @param  {...string} allowed - Roles estáticas, Nomes de Role ou Slugs de Permissão.
 */
exports.restrictTo = (...allowed) => {
  return (req, res, next) => {
    // 1. Verifica Role Estática (User.role)
    if (allowed.includes(req.user.role)) return next();

    // 2. Verifica Role Dinâmica (User.userRole.name)
    if (req.user.userRole && allowed.includes(req.user.userRole.name)) return next();

    // 3. Verifica Permissão Específica (req.permissions)
    const hasPermission = allowed.some(p => req.permissions.includes(p));
    if (hasPermission) return next();

    return next(
      new AppError('Você não tem permissão para realizar esta ação.', 403)
    );
  };
};
