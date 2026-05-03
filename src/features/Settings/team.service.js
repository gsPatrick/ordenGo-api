const { User } = require('../../models');
const AppError = require('../../utils/AppError');
const bcrypt = require('bcryptjs');

/**
 * Cria um membro da equipe interna (Super Admin, Financeiro, Suporte)
 */
exports.createInternalUser = async (data) => {
  const { name, email, password, role: roleName } = data;
  const { Role } = require('../../models');

  // Buscar Role no Banco de Dados
  let dbRole = await Role.findOne({ where: { name: roleName } });
  
  // Fallback para nomes de role antigos se não encontrar
  if (!dbRole) {
    // Se for 'superadmin', mapeamos para o role de sistema 'Super Admin'
    if (roleName === 'superadmin') {
      dbRole = await Role.findOne({ where: { name: 'Super Admin' } });
    }
  }

  if (!dbRole && !['superadmin', 'admin_finance', 'admin_support'].includes(roleName)) {
    throw new AppError('Role inválida ou não encontrada no sistema.', 400);
  }

  const exists = await User.findOne({ where: { email } });
  if (exists) throw new AppError('Email já cadastrado.', 400);

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: dbRole ? (dbRole.name === 'Super Admin' ? 'superadmin' : dbRole.name.toLowerCase().replace(' ', '_')) : roleName,
    roleId: dbRole ? dbRole.id : null,
    restaurantId: null // Equipe interna
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
