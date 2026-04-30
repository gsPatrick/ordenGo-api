const { Table, TableDevice } = require('../../models');
const AppError = require('../../utils/AppError');

/**
 * Vincula Tablet via Código Manual
 */
exports.bindDeviceToTable = async (tableCode, deviceData) => {
  const { deviceUuid, batteryLevel, appVersion } = deviceData;

  // Busca mesa pelo token (código manual)
  const table = await Table.findOne({ where: { qrCodeToken: tableCode } });
  
  if (!table) {
    throw new AppError('Código da mesa inválido.', 404);
  }

  // Busca ou cria o device
  let device = await TableDevice.findOne({ where: { deviceUuid } });

  if (!device) {
    // CREATE
    device = await TableDevice.create({
      restaurantId: table.restaurantId,
      tableId: table.uuid,
      deviceUuid: deviceUuid,
      // Ex: "Tablet Mesa 10 (A1B2)"
      name: `Tablet Mesa ${table.number} (${deviceUuid.slice(0, 4).toUpperCase()})`,
      batteryLevel: batteryLevel || null,
      appVersion: appVersion || null,
      lastActiveAt: new Date(),
      status: 'active'
    });
  } else {
    // UPDATE
    device.tableId = table.uuid;
    device.restaurantId = table.restaurantId;
    if (batteryLevel) device.batteryLevel = batteryLevel;
    if (appVersion) device.appVersion = appVersion;
    device.lastActiveAt = new Date();
    
    // Opcional: Atualiza o nome para facilitar identificação visual no painel
    // device.name = `Tablet Mesa ${table.number} (${deviceUuid.slice(0, 4).toUpperCase()})`;

    await device.save();
  }

  return { device, table };
};

/**
 * Desvincula Tablet (Set tableId = null)
 */
exports.unbindDevice = async (restaurantId, deviceId) => {
  const device = await TableDevice.findOne({ where: { id: deviceId, restaurantId } });
  
  if (!device) {
    throw new AppError('Dispositivo não encontrado.', 404);
  }

  // Guarda o ID antigo para o Socket saber qual sala notificar
  const oldTableId = device.tableId;

  device.tableId = null;
  await device.save();

  return { device, oldTableId };
};

/**
 * Lista todos
 */
exports.getAllDevices = async (restaurantId) => {
  return await TableDevice.findAll({
    where: { restaurantId },
    include: [
        { 
            model: Table, 
            attributes: ['number', 'status'] 
        }
    ],
    order: [
        ['tableId', 'ASC'], // Agrupa os que tem mesa primeiro
        ['lastActiveAt', 'DESC']
    ]
  });
};

module.exports = exports;