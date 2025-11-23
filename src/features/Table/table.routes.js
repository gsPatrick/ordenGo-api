const express = require('express');
const tableController = require('./table.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// ============================================================
// ROTA PÚBLICA: Usada pelo Tablet ao escanear o QR Code
// ============================================================
// GET /api/v1/tables/access/:token
router.get('/access/:token', tableController.initializeTablet);


// ============================================================
// ROTAS PROTEGIDAS (Abaixo daqui, tudo precisa de login)
// ============================================================
router.use(protect);

// --- ROTAS OPERACIONAIS (Garçom + Gerente) ---

// Visualizar todas as mesas (Painel de Mesas)
router.get('/', tableController.getAll);

// Atualizar Status (Garçom precisa disso para limpar mesa ou forçar status)
// Adicionamos 'waiter' na lista de permissões
router.patch('/:id/status', restrictTo('manager', 'superadmin', 'waiter'), tableController.updateStatus);


// --- ROTAS ADMINISTRATIVAS (Apenas Gerente) ---
// Garçom NÃO pode criar ou deletar mesas fisicamente no sistema
router.use(restrictTo('manager', 'superadmin'));

router.post('/', tableController.create);
router.delete('/:id', tableController.delete);

router.post('/:id/disconnect', restrictTo('manager', 'admin'), tableController.disconnectDevice);


module.exports = router;