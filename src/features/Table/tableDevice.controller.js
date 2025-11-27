const tableDeviceService = require('./tableDevice.service');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');

// ============================================================
// 1. VINCULAR (Tablet envia Código + UUID)
// ============================================================
exports.bindDevice = catchAsync(async (req, res, next) => {
  const { tableCode, deviceUuid, batteryLevel, appVersion } = req.body;

  if (!tableCode || !deviceUuid) {
    return next(new AppError('Código da mesa e DeviceUUID são obrigatórios.', 400));
  }

  const { device, table } = await tableDeviceService.bindDeviceToTable(tableCode, {
    deviceUuid,
    batteryLevel,
    appVersion
  });

  // 🔥 SOCKET: Avisa a sala da mesa (se houver outros tablets lá) e o Gerente
  if (req.io) {
    // Avisa o painel do Gerente que entrou um device novo
    req.io.to(`restaurant_${table.restaurantId}`).emit('device_updated', { device });
    
    // Opcional: Avisa a mesa que um novo "irmão" se conectou
    req.io.to(`table_${table.uuid}`).emit('device_connected', { deviceName: device.name });
  }

  res.status(200).json({
    status: 'success',
    message: `Conectado à Mesa ${table.number}`,
    data: {
      device,
      table: {
        uuid: table.uuid,
        number: table.number,
        restaurantId: table.restaurantId,
        status: table.status
      }
    }
  });
});

// ============================================================
// 2. LISTAR (Gerente vê todos os tablets)
// ============================================================
exports.listDevices = catchAsync(async (req, res, next) => {
  const devices = await tableDeviceService.getAllDevices(req.restaurantId);

  res.status(200).json({
    status: 'success',
    results: devices.length,
    data: { devices }
  });
});

// ============================================================
// 3. DESVINCULAR (Gerente chuta o tablet da mesa)
// ============================================================
exports.unbindDevice = catchAsync(async (req, res, next) => {
  // O service retorna o device ATUALIZADO (com tableId: null)
  // Mas também precisamos saber onde ele estava ANTES para notificar a sala certa
  const { device, oldTableId } = await tableDeviceService.unbindDevice(req.restaurantId, req.params.id);

  // 🔥 SOCKET CRÍTICO:
  // Precisamos avisar ESPECIFICAMENTE este tablet para ele fazer "Logout"
  if (req.io) {
    // 1. Avisa o Painel do Gerente (atualiza lista)
    req.io.to(`restaurant_${req.restaurantId}`).emit('device_updated', { device });

    // 2. Se o tablet estava conectado a uma mesa, manda um sinal para aquela mesa
    // O frontend do tablet deve escutar 'force_disconnect' e verificar se o deviceId dele bate com o payload
    if (oldTableId) {
      req.io.to(`table_${oldTableId}`).emit('force_disconnect', { 
        deviceUuid: device.deviceUuid 
      });
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Tablet desconectado com sucesso.'
  });
});

module.exports = exports;