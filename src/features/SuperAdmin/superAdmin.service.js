const bcrypt = require('bcryptjs');
const { sequelize, Restaurant, RestaurantConfig, User } = require('../../models');
const AppError = require('../../utils/AppError');

/**
 * Cria um novo Tenant (Restaurante) no sistema.
 * Cria automagicamente:
 * 1. O registro do Restaurante
 * 2. A configuração visual padrão (RestaurantConfig)
 * 3. O primeiro usuário (Gerente/Dono) desse restaurante
 */
exports.createTenant = async (data) => {
  const {
    restaurantName,
    slug,
    planType,
    managerName,
    managerEmail,
    managerPassword,
    currency
  } = data;

  // 1. Verificar se slug já existe (URL única)
  const slugExists = await Restaurant.findOne({ where: { slug } });
  if (slugExists) {
    throw new AppError('Este slug (URL) já está em uso. Escolha outro.', 400);
  }

  // 2. Verificar se email do gerente já existe no sistema
  const emailExists = await User.findOne({ where: { email: managerEmail } });
  if (emailExists) {
    throw new AppError('Este email já está cadastrado no sistema.', 400);
  }

  // INÍCIO DA TRANSAÇÃO (Tudo ou Nada)
  const transaction = await sequelize.transaction();

  try {
    // A. Criar Restaurante
    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug,
      planType,
      currency: currency || 'BRL',
      isActive: true
    }, { transaction });

    // B. Criar Configuração Padrão (Cores default, etc)
    // Isso garante que o tablet não quebre ao tentar carregar configs
    await RestaurantConfig.create({
      restaurantId: restaurant.id,
      primaryColor: '#df0024', // Vermelho OrdenGo
      secondaryColor: '#1f1c1d',
      backgroundColor: '#1f1c1d',
      enableCallWaiter: true,
      enableBillRequest: true
    }, { transaction });

    // C. Criar o Usuário Gerente (Manager)
    const hashedPassword = await bcrypt.hash(managerPassword, 12);
    
    const user = await User.create({
      restaurantId: restaurant.id,
      name: managerName,
      email: managerEmail,
      password: hashedPassword,
      role: 'manager', // Importante: ele é manager DO restaurante, não superadmin
    }, { transaction });

    // Se tudo deu certo, confirma a transação
    await transaction.commit();

    return { restaurant, user };

  } catch (error) {
    // Se algo deu errado, desfaz tudo
    await transaction.rollback();
    throw error; 
  }
};

/**
 * Lista todos os restaurantes do SaaS com paginação simples
 */
exports.getAllTenants = async () => {
  const restaurants = await Restaurant.findAll({
    include: [
      { 
        model: User, 
        where: { role: 'manager' }, // Traz o dono junto para facilitar contato
        attributes: ['name', 'email'],
        limit: 1 // Apenas um gerente principal para exibição
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  return restaurants;
};

/**
 * Bloqueia/Desbloqueia um restaurante (Ex: Falta de pagamento)
 */
exports.toggleTenantStatus = async (restaurantId) => {
  const restaurant = await Restaurant.findByPk(restaurantId);
  
  if (!restaurant) {
    throw new AppError('Restaurante não encontrado.', 404);
  }

  // Inverte o status atual
  restaurant.isActive = !restaurant.isActive;
  await restaurant.save();

  return restaurant;
};