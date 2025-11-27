const superAdminService = require('./superAdmin.service');
const catchAsync = require('../../utils/catchAsync');
const jwt = require('jsonwebtoken');
exports.createRestaurant = catchAsync(async (req, res, next) => {
  // O body agora espera campos como planId, taxId, timezone, etc.
  const { restaurant, user, plan } = await superAdminService.createTenant(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Restaurante criado com sucesso!',
    data: {
      restaurantId: restaurant.id,
      name: restaurant.name,
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
  
  // Busca o restaurante primeiro para inverter o status atual
  // (Ou podemos receber o status desejado no body, aqui faremos toggle simples)
  // Vamos adaptar o service para ser mais direto se necessário, mas vou usar a lógica de toggle do controller anterior
  // Melhorando: O service que fiz acima chama-se updateTenantStatus e espera um booleano.
  // Vamos buscar o status atual no controller para passar o inverso, ou usar o toggle do service anterior.
  
  // Para manter consistência com o código anterior, vou reusar a lógica de "toggle" no service
  // Mas como reescrevi o service, vou implementar uma lógica de toggle rápida aqui:
  
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
  
  // Busca o gerente deste restaurante
  const manager = await User.findOne({ 
    where: { restaurantId: id, role: 'manager' } 
  });

  if (!manager) {
    return next(new AppError('Este restaurante não possui um gerente ativo.', 404));
  }

  // Gera token como se fosse o gerente
  const token = jwt.sign({ id: manager.id, role: manager.role, restaurantId: manager.restaurantId }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  // Retorna token e dados para o frontend logar
  res.status(200).json({
    status: 'success',
    token,
    data: { user: manager }
  });
});