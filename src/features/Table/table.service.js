const crypto = require('crypto');
const { Table, TableSession, Restaurant, RestaurantConfig } = require('../../models/index');
const AppError = require('../../utils/AppError');

/**
 * Cria uma nova mesa e gera seu Token QR Code único
 */
exports.createTable = async (restaurantId, data) => {
  const { number } = data; // Ex: "01", "10A", "Terraço 1"

  // 1. Verificar se já existe mesa com esse número/nome neste restaurante
  const exists = await Table.findOne({ where: { restaurantId, number } });
  if (exists) {
    throw new AppError(`A mesa '${number}' já existe neste restaurante.`, 400);
  }

  // 2. Gerar um Token Único para o QR Code
  // Este token fará parte da URL: https://app.ordengo.com/t/{qrCodeToken}
  const token = crypto.randomBytes(8).toString('hex'); 

  const table = await Table.create({
    restaurantId,
    number,
    qrCodeToken: token,
    status: 'free'
  });

  return table;
};

/**
 * Lista todas as mesas do restaurante com status atual
 */
exports.getAllTables = async (restaurantId) => {
  const tables = await Table.findAll({
    where: { restaurantId },
    order: [['number', 'ASC']], // Ou ordenar por ID
    // Opcional: Incluir sessão ativa para saber detalhes (quem está sentado)
    include: [
      { 
        model: TableSession, 
        as: 'activeSession',
        required: false 
      }
    ]
  });
  return tables;
};

/**
 * Deletar mesa
 */
exports.deleteTable = async (restaurantId, tableId) => {
  const table = await Table.findOne({ where: { id: tableId, restaurantId } });
  
  if (!table) throw new AppError('Mesa não encontrada.', 404);
  
  // Regra de negócio: Não deletar mesa se estiver ocupada (sessão aberta)
  if (table.status !== 'free' && table.currentSessionId) {
    throw new AppError('Não é possível deletar uma mesa que está ocupada ou com sessão aberta.', 400);
  }

  await table.destroy();
};

/**
 * Busca dados da mesa pelo TOKEN (Usado pelo Tablet ao escanear QR)
 * Retorna dados da mesa + Configuração visual do Restaurante
 */
exports.getTableByToken = async (token) => {
  const table = await Table.findOne({
    where: { qrCodeToken: token },
    include: [
      {
        model: Restaurant,
        attributes: ['id', 'name', 'currency', 'locales'],
        include: [{ model: RestaurantConfig, as: 'config' }] // Traz cores e logo
      }
    ]
  });

  if (!table) {
    throw new AppError('QR Code inválido ou mesa não encontrada.', 404);
  }

  return table;
};

/**
 * Atualiza o status manualmente (caso o garçom precise forçar "Livre" ou "Ocupada")
 * OBS: A maioria das mudanças de status será automática via feature 'Order',
 * mas este método é útil para correções manuais.
 */
exports.updateStatus = async (restaurantId, tableId, status) => {
  const table = await Table.findOne({ where: { id: tableId, restaurantId } });
  if (!table) throw new AppError('Mesa não encontrada.', 404);

  table.status = status;
  
  // Se forçar "Livre", removemos o vínculo da sessão atual por segurança
  if (status === 'free') {
    table.currentSessionId = null;
  }

  await table.save();
  return table;
};

/**
 * Registra a conexão do Tablet (Ao ler o QR Code)
 */
exports.connectDeviceToTable = async (token, deviceInfo) => {
  const table = await Table.findOne({
    where: { qrCodeToken: token },
    include: [
      {
        model: Restaurant,
        attributes: ['id', 'name', 'currency', 'locales'],
        include: [{ model: RestaurantConfig, as: 'config' }]
      }
    ]
  });

  if (!table) {
    throw new AppError('QR Code inválido ou mesa não encontrada.', 404);
  }

  // Salva os dados do dispositivo ("Vínculo")
  table.deviceConnectedAt = new Date();
  table.deviceIp = deviceInfo.ip;
  table.deviceAgent = deviceInfo.userAgent;
  // table.deviceLocation = deviceInfo.location; // Seria preenchido se usasse geoip-lite
  table.isDeviceConnected = true;
  
  await table.save();

  return table;
};

/**
 * Gerente desconecta o tablet remotamente (Força logout)
 */
exports.disconnectDevice = async (restaurantId, tableUuid) => {
  const table = await Table.findOne({ where: { uuid: tableUuid, restaurantId } });
  
  if (!table) throw new AppError('Mesa não encontrada.', 404);

  table.deviceConnectedAt = null;
  table.deviceIp = null;
  table.deviceAgent = null;
  table.isDeviceConnected = false;
  
  await table.save();
  
  return table;
};