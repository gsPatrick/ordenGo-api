const { User } = require('../../models');
const AppError = require('../../utils/AppError');
const bcrypt = require('bcryptjs');

/**
 * Cria um membro da equipe interna (Super Admin, Financeiro, Suporte)
 */
exports.createInternalUser = async (data) => {
  const { name, email, password, role } = data;

  // Validações
  if (!['superadmin', 'admin_finance', 'admin_support', 'admin_sales'].includes(role)) {
    throw new AppError('Role inválida para equipe interna.', 400);
  }

  const exists = await User.findOne({ where: { email } });
  if (exists) throw new AppError('Email já cadastrado.', 400);

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    restaurantId: null // CRÍTICO: Isso define que ele é da equipe interna
  });

  user.password = undefined;
  return user;
};

/**
 * Lista equipe interna
 */
exports.listInternalTeam = async () => {
  return await User.findAll({
    where: { restaurantId: null },
    attributes: { exclude: ['password', 'pin'] },
    order: [['name', 'ASC']]
  });
};

/**
 * Remove membro da equipe
 */
exports.removeInternalUser = async (id, currentUserId) => {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('Usuário não encontrado.', 404);

  if (user.id === currentUserId) {
    throw new AppError('Você não pode remover a si mesmo.', 400);
  }

  // Proteção extra: Não remover o último superadmin (lógica complexa opcional)
  
  await user.destroy();
};
