const authService = require('./auth.service');
const catchAsync = require('../../utils/catchAsync');

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  const { user, token } = await authService.loginUser(email, password);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
});

exports.waiterLogin = catchAsync(async (req, res, next) => {
  // O restaurantId pode vir do corpo ou de um header configurado no tablet
  const { pin, restaurantId } = req.body; 

  const { user, token } = await authService.loginWaiterWithPin(pin, restaurantId);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
});

// Rota apenas para verificar se o token ainda é válido (usado no frontend ao recarregar página)
exports.getMe = catchAsync(async (req, res, next) => {
  // O middleware 'protect' já colocou o usuário em req.user
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});