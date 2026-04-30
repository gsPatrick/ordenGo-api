const superAdminService = require('./superAdmin.service');
const catchAsync = require('../../utils/catchAsync');
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
  if(!restaurant) return next(new AppError('Restaurante não encontrado', 404));
  
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