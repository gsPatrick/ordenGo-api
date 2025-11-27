const bcrypt = require('bcryptjs');
const { 
  sequelize, 
  Restaurant, 
  RestaurantConfig, 
  User, 
  Plan, 
  Region 
} = require('../../models');
const AppError = require('../../utils/AppError');

/**
 * Cria um novo Tenant (Restaurante) no sistema com suporte completo a dados Europeus.
 */
exports.createTenant = async (data) => {
  const {
    // Dados do Restaurante
    restaurantName,
    slug,
    taxId, // NIF, CIF, P.IVA
    billingAddress,
    contactPerson,
    timezone, // 'Europe/Madrid', 'Europe/Berlin'
    country,  // 'ES', 'DE', 'IT', 'FR'
    currency, // 'EUR'
    
    // Assinatura e Localização
    planId,   // UUID do plano selecionado
    regionId, // UUID da região (opcional)

    // Dados do Gerente
    managerName,
    managerEmail,
    managerPassword
  } = data;

  // 1. Validações Prévias
  
  // A. Slug único
  const slugExists = await Restaurant.findOne({ where: { slug } });
  if (slugExists) {
    throw new AppError('Este slug (URL) já está em uso. Escolha outro.', 400);
  }

  // B. Email único
  const emailExists = await User.findOne({ where: { email: managerEmail } });
  if (emailExists) {
    throw new AppError('Este email já está cadastrado no sistema.', 400);
  }

  // C. Validar Plano
  if (!planId) {
    throw new AppError('É obrigatório selecionar um Plano (Tier) para o restaurante.', 400);
  }
  const plan = await Plan.findByPk(planId);
  if (!plan || !plan.isActive) {
    throw new AppError('Plano selecionado é inválido ou está inativo.', 400);
  }

  // D. Validar Região (Se informada)
  if (regionId) {
    const region = await Region.findByPk(regionId);
    if (!region) {
      throw new AppError('Região selecionada não encontrada.', 404);
    }
  }

  // INÍCIO DA TRANSAÇÃO
  const transaction = await sequelize.transaction();

  try {
    // 2. Criar Restaurante com dados completos
    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug,
      taxId,
      billingAddress,
      contactPerson: contactPerson || managerName,
      timezone: timezone || 'Europe/Madrid',
      country: country || 'ES',
      currency: currency || 'EUR',
      
      // Vínculos
      planId,
      regionId: regionId || null,
      
      // Contrato (Inicia hoje)
      contractStartDate: new Date(),
      isActive: true,
      isOnboardingCompleted: false // Obriga o gerente a fazer o wizard
    }, { transaction });

    // 3. Criar Configuração Padrão (Cores e Funcionalidades)
    // Inicializa com as features do plano, se houver
    const defaultFeatures = plan.features || {};
    
    await RestaurantConfig.create({
      restaurantId: restaurant.id,
      primaryColor: '#df0024', // Vermelho Padrão
      secondaryColor: '#1f1c1d',
      backgroundColor: '#1f1c1d',
      enableCallWaiter: true,
      enableBillRequest: true,
      // Se o plano desativa ads, já salvamos essa preferência aqui futuramente
    }, { transaction });

    // 4. Criar o Usuário Gerente
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
