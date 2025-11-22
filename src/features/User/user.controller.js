const userService = require('./user.service');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

exports.createMember = catchAsync(async (req, res, next) => {
  const user = await userService.createTeamMember(req.restaurantId, req.body);

  res.status(201).json({
    status: 'success',
    data: { user }
  });
});

exports.getAllMembers = catchAsync(async (req, res, next) => {
  const users = await userService.getTeam(req.restaurantId);

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

exports.updateMember = catchAsync(async (req, res, next) => {
  const user = await userService.updateTeamMember(req.restaurantId, req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

exports.deleteMember = catchAsync(async (req, res, next) => {
  // Segurança: Não deletar a si mesmo
  if (req.params.id === req.user.id) {
    return next(new AppError('Você não pode deletar sua própria conta.', 400));
  }

  await userService.deleteTeamMember(req.restaurantId, req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});