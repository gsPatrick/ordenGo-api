const superAdminService = require('./superAdmin.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const jwt = require('jsonwebtoken');

const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
} = require('../../models');

exports.createRestaurant = catchAsync(async (req, res, next) => {
  const { restaurant, user, plan } = await superAdminService.createTenant(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Restaurante criado com sucesso!',
    data: {
      restaurantId: restaurant.id,
      name: restaurant.name,
      accessCode: restaurant.accessCode, // <--- RETORNA O CÓDIGO AQUI PARA O ADMIN VER
      managerEmail: user.email,
      plan: plan.name,
      country: restaurant.country
    }
  });
});

exports.listRestaurants = catchAsync(async (req, res, next) => {
  const restaurants = await superAdminService.getAllTenants();

  res.status(200).json({
    status: 'success',
    results: restaurants.length,
    data: {
      restaurants
    }
  });
});

exports.toggleStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const { Restaurant } = require('../../models');
  const restaurant = await Restaurant.findByPk(id);
  if (!restaurant) return next(new AppError('Restaurante não encontrado', 404));

  restaurant.isActive = !restaurant.isActive;
  await restaurant.save();

  res.status(200).json({
    status: 'success',
    message: `Restaurante ${restaurant.isActive ? 'ativado' : 'bloqueado'} com sucesso.`,
    data: {
      isActive: restaurant.isActive
    }
  });
});

exports.impersonateTenant = catchAsync(async (req, res, next) => {
  const { id } = req.params; // ID do Restaurante

  const manager = await User.findOne({
    where: { restaurantId: id, role: 'manager' }
  });

  if (!manager) {
    return next(new AppError('Este restaurante não possui um gerente ativo.', 404));
  }

  // ALTERAÇÃO: Removido '1h' hardcoded. Agora usa a config global ou 3d.
  const token = jwt.sign(
    { id: manager.id, role: manager.role, restaurantId: manager.restaurantId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '3d' }
  );

  res.status(200).json({
    status: 'success',
    token,
    data: { user: manager }
  });
});

exports.updateRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await superAdminService.updateTenant(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { restaurant } });
});

exports.deleteRestaurant = catchAsync(async (req, res, next) => {
  await superAdminService.deleteTenant(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

exports.listDocuments = catchAsync(async (req, res, next) => {
  const documents = await superAdminService.getDocuments(req.params.id);
  res.status(200).json({ status: 'success', results: documents.length, data: { documents } });
});

exports.uploadDocument = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('No file uploaded', 400));
  const document = await superAdminService.addDocument(req.params.id, req.file, req.body.type);
  res.status(201).json({ status: 'success', data: { document } });
});

exports.deleteDocument = catchAsync(async (req, res, next) => {
  await superAdminService.removeDocument(req.params.id, req.params.docId);
  res.status(204).json({ status: 'success', data: null });
});