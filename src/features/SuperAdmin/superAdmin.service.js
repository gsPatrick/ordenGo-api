const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const {
  sequelize,
  Restaurant,
  RestaurantConfig,
  User,
  Plan,
  Region,
  RestaurantDocument,
  RestaurantNote
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
    managerName, managerEmail, managerPassword,
    // Configurações de Screensaver (Opcionais)
    screensaverIdleTime, screensaverAdminBatchSize, screensaverClientBatchSize
  } = data;

  // 1. Validações Prévias (Mantidas)
  const slugExists = await Restaurant.findOne({ where: { slug } });
  if (slugExists) throw new AppError('Slug ya en uso.', 400);

  const emailExists = await User.findOne({ where: { email: managerEmail } });
  if (emailExists) throw new AppError('Email ya registrado.', 400);

  const plan = await Plan.findByPk(planId);
  if (!plan || !plan.isActive) throw new AppError('Plan inválido.', 400);

  // 2. Gerar Código Único
  let accessCode = generateAccessCode();
  while (await Restaurant.findOne({ where: { accessCode } })) {
    accessCode = generateAccessCode();
  }

  const transaction = await sequelize.transaction();

  try {
    // 3. Criar Restaurante
    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug,
      accessCode,
      taxId,
      billingAddress,
      contactPerson: contactPerson || managerName,
      timezone: timezone || 'Europe/Madrid',
      country: country || 'ES',
      currency: currency || 'EUR',
      planId,
      regionId: regionId || null,
      contractStartDate: new Date(),
      isActive: true, // Default active
      isOnboardingCompleted: false
    }, { transaction });

    // 4. Configuração Padrão + Screensaver
    await RestaurantConfig.create({
      restaurantId: restaurant.id,
      primaryColor: '#df0024',
      secondaryColor: '#1f1c1d',
      backgroundColor: '#1f1c1d',
      screensaverIdleTime: screensaverIdleTime || 120,
      screensaverAdminBatchSize: screensaverAdminBatchSize || 3,
      screensaverClientBatchSize: screensaverClientBatchSize || 1
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
 * Lista todos os restaurantes com seus Planos, Regiões E CONFIGURAÇÃO
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
      { model: Plan, attributes: ['name', 'priceMonthly', 'currency'] },
      { model: Region, attributes: ['name', 'country'] },
      { model: RestaurantConfig, as: 'config' } // Incluindo Config
    ],
    order: [['createdAt', 'DESC']]
  });

  return restaurants;
};

exports.getTenantById = async (id) => {
  return await Restaurant.findByPk(id, {
    include: [
      { model: Plan },
      { model: Region },
      { model: RestaurantConfig, as: 'config' }, // Incluindo Config
      { model: User, where: { role: 'manager' }, required: false }
    ]
  });
};

/**
 * Bloqueia/Desbloqueia e atualiza dados rápidos
 */
exports.updateTenantStatus = async (restaurantId, isActive) => {
  const restaurant = await Restaurant.findByPk(restaurantId);
  if (!restaurant) throw new AppError('Restaurante no encontrado.', 404);

  restaurant.isActive = isActive;
  await restaurant.save();

  return restaurant;
};

exports.updateTenant = async (id, data) => {
  const restaurant = await Restaurant.findByPk(id, { include: [{ model: RestaurantConfig, as: 'config' }] });
  if (!restaurant) throw new AppError('Restaurante no encontrado.', 404);

  // Atualiza dados do Restaurante
  await restaurant.update(data);

  // Atualiza Configuração se fornecida
  if (data.config && restaurant.config) {
    await restaurant.config.update(data.config);
  } else if (data.config && !restaurant.config) {
    // Caso raro onde config não existe
    await RestaurantConfig.create({ ...data.config, restaurantId: id });
  }

  return restaurant;
};

exports.deleteTenant = async (id) => {
  const restaurant = await Restaurant.findByPk(id);
  if (!restaurant) throw new AppError('Restaurante no encontrado.', 404);
  await restaurant.destroy();
};

exports.getDocuments = async (restaurantId) => {
  return await RestaurantDocument.findAll({ where: { restaurantId } });
};

exports.addDocument = async (restaurantId, file, type) => {
  const url = '/uploads/' + file.filename;

  return await RestaurantDocument.create({
    restaurantId,
    name: file.originalname,
    url,
    type: type || 'other'
  });
};

exports.removeDocument = async (restaurantId, docId) => {
  const doc = await RestaurantDocument.findOne({ where: { id: docId, restaurantId } });
  if (!doc) throw new AppError('Documento no encontrado.', 404);

  // Opcional: Deletar arquivo físico
  const filePath = path.join(__dirname, '../../../public', doc.url);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await doc.destroy();
};

exports.updateDocument = async (restaurantId, docId, data) => {
  const doc = await RestaurantDocument.findOne({ where: { id: docId, restaurantId } });
  if (!doc) throw new AppError('Documento no encontrado.', 404);

  // Update allowed fields
  if (data.name) doc.name = data.name;
  if (data.type) doc.type = data.type;
  if (data.amount !== undefined) doc.amount = data.amount;
  if (data.dueDate !== undefined) doc.dueDate = data.dueDate;
  if (data.description !== undefined) doc.description = data.description;
  if (data.status) doc.status = data.status;

  await doc.save();
  return doc;
};

exports.payDocument = async (restaurantId, docId) => {
  const doc = await RestaurantDocument.findOne({ where: { id: docId, restaurantId } });
  if (!doc) throw new AppError('Documento no encontrado.', 404);

  doc.status = 'paid';
  await doc.save();
  return doc;
};

// --- NOTES ---
exports.getNotes = async (restaurantId) => {
  return await RestaurantNote.findAll({
    where: { restaurantId },
    order: [['createdAt', 'DESC']]
  });
};

exports.addNote = async (restaurantId, content, createdBy) => {
  return await RestaurantNote.create({
    restaurantId,
    content,
    createdBy
  });
};

exports.deleteNote = async (restaurantId, noteId) => {
  const note = await RestaurantNote.findOne({ where: { id: noteId, restaurantId } });
  if (!note) throw new AppError('Nota no encontrada.', 404);
  await note.destroy();
};
