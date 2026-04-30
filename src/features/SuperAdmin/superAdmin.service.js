const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Importar crypto

const { 
  sequelize, 
  Restaurant, 
  RestaurantConfig, 
  User, 
  Plan, 
  Region 
} = require('../../models');
const AppError = require('../../utils/AppError');


// Função auxiliar para gerar código curto (ex: A1B2C3)
const generateAccessCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // Gera 6 caracteres
};

/**
 * Cria um novo Tenant (Restaurante) no sistema com suporte completo a dados Europeus.
 */
exports.createTenant = async (data) => {
  const {
    restaurantName, slug, taxId, billingAddress, contactPerson,
    timezone, country, currency, planId, regionId,
    managerName, managerEmail, managerPassword
  } = data;

  // 1. Validações Prévias (Mantidas)
  const slugExists = await Restaurant.findOne({ where: { slug } });
  if (slugExists) throw new AppError('Slug já em uso.', 400);

  const emailExists = await User.findOne({ where: { email: managerEmail } });
  if (emailExists) throw new AppError('Email já cadastrado.', 400);

  const plan = await Plan.findByPk(planId);
  if (!plan || !plan.isActive) throw new AppError('Plano inválido.', 400);

  // 2. Gerar Código Único
  let accessCode = generateAccessCode();
  // Loop de segurança simples para garantir unicidade (muito raro colidir, mas bom ter)
  while (await Restaurant.findOne({ where: { accessCode } })) {
    accessCode = generateAccessCode();
  }

  const transaction = await sequelize.transaction();

  try {
    // 3. Criar Restaurante com accessCode
    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug,
      accessCode, // <--- SALVANDO O CÓDIGO AQUI
      taxId,
      billingAddress,
      contactPerson: contactPerson || managerName,
      timezone: timezone || 'Europe/Madrid',
      country: country || 'ES',
      currency: currency || 'EUR',
      planId,
      regionId: regionId || null,
      contractStartDate: new Date(),
      isActive: true,
      isOnboardingCompleted: false
    }, { transaction });

    // ... (Configuração Padrão e Criação do Usuário mantidas iguais) ...
    await RestaurantConfig.create({
      restaurantId: restaurant.id,
      primaryColor: '#df0024',
      secondaryColor: '#1f1c1d',
      backgroundColor: '#1f1c1d'
    }, { transaction });

    const hashedPassword = await bcrypt.hash(managerPassword, 12);
    
    const user = await User.create({
      restaurantId: restaurant.id,
      name: managerName,
      email: managerEmail,
      password: hashedPassword,
      role: 'manager', 
    }, { transaction });

    await transaction.commit();

    return { restaurant, user, plan };

  } catch (error) {
    await transaction.rollback();
    throw error; 
  }
};

/**
 * Lista todos os restaurantes com seus Planos e Regiões
 */
exports.getAllTenants = async () => {
  const restaurants = await Restaurant.findAll({
    include: [
      { 
        model: User, 
        where: { role: 'manager' },
        attributes: ['name', 'email'],
        limit: 1 
      },
      {
        model: Plan,
        attributes: ['name', 'priceMonthly', 'currency']
      },
      {
        model: Region,
        attributes: ['name', 'country']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  return restaurants;
};

/**
 * Bloqueia/Desbloqueia e atualiza dados rápidos
 */
exports.updateTenantStatus = async (restaurantId, isActive) => {
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) throw new AppError('Restaurante não encontrado.', 404);

  restaurant.isActive = isActive;
  await restaurant.save();

  return restaurant;
};
