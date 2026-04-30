const bcrypt = require('bcryptjs');
const { User } = require('../../models');
const AppError = require('../../utils/AppError');
const { Op } = require('sequelize');

/**
 * Cria um novo membro da equipe (Garçom, Cozinha ou outro Gerente)
 */
exports.createTeamMember = async (restaurantId, data) => {
  const { name, email, password, pin, role } = data;

  // Validação específica por Role
  if (role === 'waiter') {
    if (!pin) throw new AppError('Garçons precisam de um PIN de acesso.', 400);
    
    // Verificar se PIN já existe NESTE restaurante
    const pinExists = await User.findOne({ 
      where: { restaurantId, pin } 
    });
    if (pinExists) throw new AppError('Este PIN já está sendo usado por outro funcionário.', 400);
  }

  if (role === 'manager') {
    if (!email || !password) throw new AppError('Gerentes precisam de Email e Senha.', 400);
    
    // Verificar se Email já existe no sistema
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) throw new AppError('Este email já está cadastrado.', 400);
  }

  // Hash da senha se houver
  let hashedPassword = null;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 12);
  }

  const user = await User.create({
    restaurantId,
    name,
    email: email || null,
    password: hashedPassword,
    pin: pin || null,
    role
  });

  user.password = undefined; // Segurança no retorno
  return user;
};

/**
 * Lista toda a equipe do restaurante
 */
exports.getTeam = async (restaurantId) => {
  const users = await User.findAll({
    where: { restaurantId },
    attributes: { exclude: ['password'] }, // Nunca retornar senha
    order: [['name', 'ASC']]
  });
  return users;
};

/**
 * Atualiza dados de um funcionário
 */
exports.updateTeamMember = async (restaurantId, userId, data) => {
  const user = await User.findOne({ where: { id: userId, restaurantId } });
  
  if (!user) {
    throw new AppError('Funcionário não encontrado.', 404);
  }

  // Impedir que um gerente se rebaixe ou mude sua própria role se for o único (regra de negócio opcional, mas segura)
  // Aqui vamos simplificar:
  
  if (data.name) user.name = data.name;
  if (data.role) user.role = data.role;

  // Atualizar PIN (Validar duplicidade)
  if (data.pin && data.pin !== user.pin) {
    const pinExists = await User.findOne({ 
      where: { restaurantId, pin: data.pin, id: { [Op.ne]: userId } } 
    });
    if (pinExists) throw new AppError('Este PIN já está em uso.', 400);
    user.pin = data.pin;
  }

  // Atualizar Senha
  if (data.password) {
    user.password = await bcrypt.hash(data.password, 12);
  }

  await user.save();
  user.password = undefined;
  return user;
};

/**
 * Remove um funcionário
 */
exports.deleteTeamMember = async (restaurantId, userId) => {
  const user = await User.findOne({ where: { id: userId, restaurantId } });

  if (!user) {
    throw new AppError('Funcionário não encontrado.', 404);
  }

  // Regra de segurança: Não deixar deletar a si mesmo para não ficar sem acesso
  // (Isso seria verificado no Controller comparando com req.user.id)
  
  await user.destroy();
};