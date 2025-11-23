const tableService = require('./table.service');
const catchAsync = require('../../utils/catchAsync');

// --- Rotas Administrativas (Gerente) ---

exports.create = catchAsync(async (req, res, next) => {
  const table = await tableService.createTable(req.restaurantId, req.body);

  // Montamos a URL completa para facilitar o frontend gerar o QR Code
  // Supondo que o FRONTEND rode em app.ordengo.com
  const qrUrl = `${process.env.FRONTEND_URL}/table/${table.qrCodeToken}`;

  res.status(201).json({
    status: 'success',
    data: { 
      table,
      qrUrl
    }
  });
});

exports.getAll = catchAsync(async (req, res, next) => {
  const tables = await tableService.getAllTables(req.restaurantId);

  res.status(200).json({
    status: 'success',
    results: tables.length,
    data: { tables }
  });
});

exports.delete = catchAsync(async (req, res, next) => {
  await tableService.deleteTable(req.restaurantId, req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.updateStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const table = await tableService.updateStatus(req.restaurantId, req.params.id, status);
  
  // TODO: Aqui futuramente emitiremos um Socket Event para avisar a dashboard
  // req.io.to(req.restaurantId).emit('table_updated', table);

  res.status(200).json({
    status: 'success',
    data: { table }
  });
});


// --- Rota Pública (Tablet / Cliente) ---

exports.initializeTablet = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const tableData = await tableService.getTableByToken(token);

  res.status(200).json({
    status: 'success',
    message: 'Mesa identificada com sucesso',
    data: {
      table: {
        id: tableData.id,
        number: tableData.number,
        status: tableData.status,
        // Importante: não mandamos sessions antigas, apenas a atual se houver
        currentSessionId: tableData.currentSessionId
      },
      restaurant: tableData.Restaurant // Inclui config visual
    }
  });
});

// ROTA PÚBLICA: Inicializar Tablet
exports.initializeTablet = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  
  // Captura informações do request para auditoria
  const deviceInfo = {
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  const tableData = await tableService.connectDeviceToTable(token, deviceInfo);

  res.status(200).json({
    status: 'success',
    message: 'Dispositivo vinculado à mesa com sucesso',
    data: {
      table: {
        id: tableData.id, // ID numérico (se o front usar)
        uuid: tableData.uuid, // UUID (recomendado)
        number: tableData.number,
        status: tableData.status,
        currentSessionId: tableData.currentSessionId,
        connectedAt: tableData.deviceConnectedAt
      },
      // Aqui enviamos as configs críticas que você pediu
      restaurant: {
        id: tableData.Restaurant.id,
        name: tableData.Restaurant.name,
        currency: tableData.Restaurant.currency, // MOEDA SALVA AQUI
        locales: tableData.Restaurant.locales,   // IDIOMAS SALVOS AQUI
        config: {
            // TOGGLES SALVOS AQUI
            enableCallWaiter: tableData.Restaurant.config.enableCallWaiter,
            enableBillRequest: tableData.Restaurant.config.enableBillRequest,
            // Cores e Logo
            primaryColor: tableData.Restaurant.config.primaryColor,
            logoUrl: tableData.Restaurant.config.logoUrl,
            wifiSsid: tableData.Restaurant.config.wifiSsid,
            wifiPassword: tableData.Restaurant.config.wifiPassword
        }
      }
    }
  });
});

// ROTA PROTEGIDA: Desconectar Dispositivo
exports.disconnectDevice = catchAsync(async (req, res, next) => {
  await tableService.disconnectDevice(req.restaurantId, req.params.id);
  
  // Avisa o tablet via Socket para ele "se desligar" ou voltar pra tela de login
  // req.io.to(`table_${req.params.id}`).emit('force_disconnect'); // Necessita ID numérico ou UUID consistente

  res.status(200).json({ status: 'success', message: 'Dispositivo desconectado.' });
});