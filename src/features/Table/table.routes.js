const express = require('express');
const tableController = require('./table.controller');
const tableDeviceController = require('./tableDevice.controller'); 
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// ============================================================
// 1. ROTAS PÚBLICAS (Tablet)
// ============================================================

// [ANTIGO - LEGADO] Inicialização via GET no Token
router.get('/access/:token', tableController.initializeTablet);

// [NOVO] Vinculação de Dispositivo via Código Manual + UUID
// O tablet envia { "tableCode": "...", "deviceUuid": "..." }
// É PÚBLICA pois o tablet ainda não tem login de usuário, ele se autentica pelo Código da Mesa
router.post('/bind-device', tableDeviceController.bindDevice);


// ============================================================
// 2. ROTAS PROTEGIDAS (Abaixo daqui, tudo precisa de login)
// ============================================================
router.use(protect);

// --- ROTAS OPERACIONAIS (Garçom + Gerente) ---

// Visualizar todas as mesas (Painel de Mesas)
router.get('/', tableController.getAll);

// Atualizar Status da Mesa (Livre/Ocupada/Limpeza)
router.patch('/:id/status', restrictTo('manager', 'superadmin', 'waiter'), tableController.updateStatus);


// --- ROTAS DE GESTÃO DE DISPOSITIVOS (Tablets) ---
// MUDANÇA AQUI: Adicionado 'waiter' para permitir que o garçom veja e gerencie tablets

// Listar todos os tablets e onde estão conectados
router.get('/devices', restrictTo('manager', 'superadmin', 'waiter'), tableDeviceController.listDevices);

// Desconectar um tablet específico de sua mesa (Reset Remoto)
router.patch('/devices/:id/unbind', restrictTo('manager', 'superadmin', 'waiter'), tableDeviceController.unbindDevice);


// --- ROTAS ADMINISTRATIVAS DE MESA (Apenas Gerente) ---
// Criar ou deletar a estrutura FÍSICA de mesas no sistema (Ex: "Construí uma mesa nova")
// Garçom não deve poder deletar a mesa do banco de dados, apenas gerenciar o tablet dela.

router.use(restrictTo('manager', 'superadmin'));

router.post('/', tableController.create);
router.delete('/:id', tableController.delete);

// [ANTIGO] Rota de desconexão legada baseada no ID da Mesa (se ainda usar)
router.post('/:id/disconnect', tableController.disconnectDevice);

module.exports = router;