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