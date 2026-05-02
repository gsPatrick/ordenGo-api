const { Role, Permission } = require('../../models');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

exports.getAllRoles = catchAsync(async (req, res) => {
  const roles = await Role.findAll({
    include: [{ model: Permission }]
  });
  res.status(200).json({ status: 'success', data: { roles } });
});

exports.createRole = catchAsync(async (req, res) => {
  const { name, description, permissionIds } = req.body;
  
  const role = await Role.create({ name, description });
  
  if (permissionIds && permissionIds.length > 0) {
    await role.setPermissions(permissionIds);
  }
  
  res.status(201).json({ status: 'success', data: { role } });
});

exports.updateRole = catchAsync(async (req, res) => {
  const { name, description, permissionIds } = req.body;
  const role = await Role.findByPk(req.params.id);
  if (!role) throw new AppError('Cargo não encontrado', 404);
  
  await role.update({ name, description });
  
  if (permissionIds) {
    await role.setPermissions(permissionIds);
  }
  
  res.status(200).json({ status: 'success', data: { role } });
});

exports.getAllPermissions = catchAsync(async (req, res) => {
  const permissions = await Permission.findAll();
  res.status(200).json({ status: 'success', data: { permissions } });
});
