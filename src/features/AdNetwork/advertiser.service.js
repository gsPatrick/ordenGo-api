const { Advertiser, Campaign, Invoice, sequelize } = require('../../models');
const AppError = require('../../utils/AppError');
const { Op } = require('sequelize');

/**
 * Cria um novo Anunciante
 */
exports.createAdvertiser = async (data) => {
  const { 
    companyName, 
    taxId, 
    contactName, 
    email, 
    phone, 
    contractStart, 
    contractEnd 
  } = data;

  // 1. Validação de Duplicidade (Email ou TaxID)
  if (email) {
    const emailExists = await Advertiser.findOne({ where: { email } });
    if (emailExists) {
      throw new AppError('Já existe um anunciante cadastrado com este e-mail.', 400);
    }
  }

  if (taxId) {
    const taxExists = await Advertiser.findOne({ where: { taxId } });
    if (taxExists) {
      throw new AppError('Já existe um anunciante cadastrado com este NIF/CNPJ.', 400);
    }
  }

  // 2. Criação
  const advertiser = await Advertiser.create({
    companyName,
    taxId,
    contactName,
    email,
    phone,
    contractStart: contractStart || new Date(),
    contractEnd,
    isActive: true
  });

  return advertiser;
};

/**
 * Lista Anunciantes com filtros e contagem de campanhas
 */
exports.getAllAdvertisers = async (query) => {
  const where = {};
  
  // Filtro por Status
  if (query.status === 'active') where.isActive = true;
  if (query.status === 'inactive') where.isActive = false;

  // Busca de Texto
  if (query.search) {
    where[Op.or] = [
      { companyName: { [Op.iLike]: `%${query.search}%` } },
      { contactName: { [Op.iLike]: `%${query.search}%` } },
      { email: { [Op.iLike]: `%${query.search}%` } }
    ];
  }

  const advertisers = await Advertiser.findAll({
    where,
    include: [
      { 
        model: Campaign, 
        attributes: ['id'], // Apenas para contar
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  // Formatando retorno para incluir contagem simples
  return advertisers.map(adv => {
    const plain = adv.toJSON();
    plain.campaignsCount = plain.Campaigns ? plain.Campaigns.length : 0;
    delete plain.Campaigns; // Remove o array pesado
    return plain;
  });
};

/**
 * Busca detalhes completos de um Anunciante
 */
exports.getAdvertiserById = async (id) => {
  const advertiser = await Advertiser.findByPk(id, {
    include: [
      { 
        model: Campaign, 
        attributes: ['id', 'title', 'status', 'startDate', 'endDate'],
        limit: 10, // Últimas 10 campanhas
        order: [['createdAt', 'DESC']]
      },
      {
        model: Invoice, // Histórico Financeiro
        attributes: ['id', 'total', 'status', 'dueDate', 'createdAt'],
        limit: 5,
        order: [['createdAt', 'DESC']]
      }
    ]
  });

  if (!advertiser) {
    throw new AppError('Anunciante não encontrado.', 404);
  }

  return advertiser;
};

/**
 * Atualiza dados do Anunciante
 */
exports.updateAdvertiser = async (id, data) => {
  const advertiser = await Advertiser.findByPk(id);
  if (!advertiser) throw new AppError('Anunciante não encontrado.', 404);

  // Proteção contra duplicidade na edição
  if (data.email && data.email !== advertiser.email) {
    const exists = await Advertiser.findOne({ where: { email: data.email } });
    if (exists) throw new AppError('Este e-mail já está em uso por outro parceiro.', 400);
  }

  await advertiser.update(data);
  return advertiser;
};

/**
 * Remove Anunciante (Com verificação de segurança)
 */
exports.deleteAdvertiser = async (id) => {
  const advertiser = await Advertiser.findByPk(id);
  if (!advertiser) throw new AppError('Anunciante não encontrado.', 404);

  // Integridade: Não apagar se tiver campanhas ativas ou histórico financeiro
  const campaignsCount = await Campaign.count({ where: { advertiserId: id } });
  const invoicesCount = await Invoice.count({ where: { advertiserId: id } });

  if (campaignsCount > 0 || invoicesCount > 0) {
    // Soft Delete manual (Desativar) se tiver histórico
    advertiser.isActive = false;
    await advertiser.save();
    throw new AppError(`Não é possível excluir permanentemente: Este anunciante possui ${campaignsCount} campanhas e ${invoicesCount} faturas. Ele foi apenas DESATIVADO para preservar o histórico.`, 400);
  }

  // Se for novo e sem histórico, pode deletar
  await advertiser.destroy();
};