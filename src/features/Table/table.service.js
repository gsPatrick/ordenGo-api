const crypto = require('crypto');
const { Table, TableSession, Restaurant, RestaurantConfig } = require('../../models/index');
const AppError = require('../../utils/AppError');

/**
 * Cria uma nova mesa e gera seu Token QR Code único
 */
exports.createTable = async (restaurantId, data) => {
  const number = data.number || data.name; // Suporte a ambos os campos do frontend

  if (!number) {
    throw new AppError('O número ou nome da mesa é obrigatório.', 400);
  }

  // 1. Verificar se já existe mesa com esse número/nome neste restaurante
  const exists = await Table.findOne({ where: { restaurantId, number } });
  if (exists) {
    throw new AppError(`A mesa '${number}' já existe neste restaurante.`, 400);
  }

  // 2. Gerar um Token Único para o QR Code
  const token = crypto.randomBytes(8).toString('hex');
  const shortPin = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos

  const table = await Table.create({
    restaurantId,
    number,
    qrCodeToken: token,
    shortPin: shortPin,
    status: 'free'
  });

  return table;
};

/**
 * Valida um PIN curto para reconexão do Tablet
 */
exports.validateShortPIN = async (restaurantId, pin) => {
  const table = await Table.findOne({
    where: { restaurantId, shortPin: pin },
    include: [
      {
        model: Restaurant,
        attributes: ['id', 'name', 'currency'],
        include: [{ model: RestaurantConfig, as: 'config' }]
      }
    ]
  });

  if (!table) throw new AppError('PIN inválido.', 401);
  return table;
};

/**
 * Regenera o Token do QR Code (Segurança ao limpar mesa)
 */
exports.regenerateTableToken = async (restaurantId, tableId) => {
  const table = await Table.findOne({ where: { id: tableId, restaurantId } });
  if (!table) throw new AppError('Mesa não encontrada.', 404);

  const newToken = crypto.randomBytes(8).toString('hex');
  table.qrCodeToken = newToken;
  await table.save();
  
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
      },
      {
        model: TableSession,
        as: 'activeSession',
        required: false
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

exports.transferTable = async (restaurantId, sourceUuid, targetTableId) => {
  const sourceTable = await Table.findOne({ where: { uuid: sourceUuid, restaurantId } });
  const targetTable = await Table.findOne({ where: { id: targetTableId, restaurantId } });

  if (!sourceTable || !targetTable) throw new AppError('Mesa não encontrada.', 404);
  if (targetTable.status !== 'free') throw new AppError('A mesa de destino não está livre.', 400);
  if (!sourceTable.currentSessionId) throw new AppError('A mesa de origem não tem uma sessão ativa.', 400);

  const sessionId = sourceTable.currentSessionId;

  // 1. Atualizar Sessão para apontar para a nova mesa
  const session = await TableSession.findByPk(sessionId);
  if (session) {
    session.tableId = targetTable.uuid;
    await session.save();
  }

  // 2. Atualizar Mesa de Destino
  targetTable.currentSessionId = sessionId;
  targetTable.status = 'occupied';
  await targetTable.save();

  // 3. Limpar Mesa de Origem
  sourceTable.currentSessionId = null;
  sourceTable.status = 'free';
  await sourceTable.save();

  return { sourceTable, targetTable };
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