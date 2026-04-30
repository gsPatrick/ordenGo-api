const { Advertiser, Campaign } = require('../../models');
const AppError = require('../../utils/AppError');
const { Op } = require('sequelize');

/**
 * Cria um novo Anunciante (Empresa parceira)
 */
exports.createAdvertiser = async (data) => {
  // data: companyName, taxId, contactName, email, phone, contractStart, contractEnd
  
  // Validação simples de duplicidade por Email ou TaxID (se fornecido)
  if (data.email) {
    const exists = await Advertiser.findOne({ where: { email: data.email } });
    if (exists) throw new AppError('Já existe um anunciante com este e-mail.', 400);
  }

  const advertiser = await Advertiser.create({
    companyName: data.companyName,
    taxId: data.taxId,
    contactName: data.contactName,
    email: data.email,
    phone: data.phone,
    contractStart: data.contractStart || new Date(),
    contractEnd: data.contractEnd,
    isActive: true
  });

  return advertiser;
};

/**
 * Lista Anunciantes (com opção de filtro por status)
 */
exports.getAllAdvertisers = async (status) => {
  const where = {};
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;

  return await Advertiser.findAll({
    where,
    order: [['companyName', 'ASC']],
    // Opcional: Contar quantas campanhas ativas eles têm
    // include: [{ model: Campaign, attributes: ['id'] }] 
  });
};

/**
 * Busca Anunciante por ID
 */
exports.getAdvertiserById = async (id) => {
  const advertiser = await Advertiser.findByPk(id, {
    include: [
        { 
            model: Campaign, 
            attributes: ['id', 'title', 'status', 'startDate', 'endDate'] // Mostra histórico básico
        }
    ]
  });

  if (!advertiser) throw new AppError('Anunciante não encontrado.', 404);
  return advertiser;
};

/**
 * Atualiza dados do Anunciante
 */
exports.updateAdvertiser = async (id, data) => {
  const advertiser = await Advertiser.findByPk(id);
  if (!advertiser) throw new AppError('Anunciante não encontrado.', 404);

  await advertiser.update(data);
  return advertiser;
};

/**
 * Deleta Anunciante (com verificação de segurança)
 */
exports.deleteAdvertiser = async (id) => {
  const advertiser = await Advertiser.findByPk(id);
  if (!advertiser) throw new AppError('Anunciante não encontrado.', 404);

  // Verificar se existem campanhas vinculadas (Integridade Referencial)
  const campaignsCount = await Campaign.count({ where: { advertiserId: id } });
  
  if (campaignsCount > 0) {
    throw new AppError(`Não é possível excluir este anunciante pois ele possui ${campaignsCount} campanhas registradas. Arquive-o ou exclua as campanhas primeiro.`, 400);
  }

  await advertiser.destroy();
};
