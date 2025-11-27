const { Restaurant, RestaurantConfig } = require('../../models');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

exports.resolveSetupCode = catchAsync(async (req, res, next) => {
  const { code } = req.params;

  if (!code) {
    return next(new AppError('Código é obrigatório.', 400));
  }

  // Busca o restaurante pelo código (Case insensitive se possível, ou force upper)
  const restaurant = await Restaurant.findOne({ 
    where: { accessCode: code.toUpperCase() },
    attributes: ['id', 'name', 'slug', 'isActive'],
    include: [{ model: RestaurantConfig, as: 'config', attributes: ['logoUrl', 'primaryColor'] }]
  });

  if (!restaurant) {
    return next(new AppError('Código inválido ou restaurante não encontrado.', 404));
  }

  if (!restaurant.isActive) {
    return next(new AppError('Este restaurante está desativado.', 403));
  }

  // Gera as URLs baseadas no Frontend URL configurado no ENV
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  // URLs Inteligentes para o PWA
  const pwaLinks = {
    // PWA Garçom: Já cai na tela de login com o restaurante pré-selecionado via ID ou Slug
    waiterApp: `${baseUrl}/waiter/login?restaurantId=${restaurant.id}`,
    
    // PWA Mesa/Tablet: Cai na tela de setup onde ele só vai precisar inserir o "Código da Mesa" depois
    tableApp: `${baseUrl}/table/setup?restaurantId=${restaurant.id}`,
    
    // Painel Admin (Manager)
    managerDashboard: `${baseUrl}/admin/login?email=${restaurant.slug}@ordengo.com` // Exemplo
  };

  res.status(200).json({
    status: 'success',
    data: {
      restaurant: {
        name: restaurant.name,
        logo: restaurant.config?.logoUrl,
        color: restaurant.config?.primaryColor
      },
      links: pwaLinks
    }
  });
});