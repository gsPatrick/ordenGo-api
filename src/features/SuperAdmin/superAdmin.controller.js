const superAdminService = require('./superAdmin.service');
const catchAsync = require('../../utils/catchAsync');

exports.createRestaurant = catchAsync(async (req, res, next) => {
  const { restaurant, user } = await superAdminService.createTenant(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Restaurante e Gerente criados com sucesso!',
    data: {
      restaurantId: restaurant.id,
      managerEmail: user.email,
      slug: restaurant.slug
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
  const restaurant = await superAdminService.toggleTenantStatus(id);

  res.status(200).json({
    status: 'success',
    message: `Restaurante ${restaurant.isActive ? 'ativado' : 'bloqueado'} com sucesso.`,
    data: {
      isActive: restaurant.isActive
    }
  });
});