const express = require('express');
const tableController = require('./table.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

const router = express.Router();

// ROTA PÚBLICA: Usada pelo Tablet ao escanear o QR Code
// GET /api/tables/access/:token
router.get('/access/:token', tableController.initializeTablet);


// ROTAS PROTEGIDAS (Abaixo daqui, tudo precisa de login)
router.use(protect);

// Apenas visualização (Garçons e Gerentes podem ver as mesas)
router.get('/', tableController.getAll);

// Apenas Gerentes podem Criar/Deletar mesas
router.use(restrictTo('manager', 'superadmin'));

router.post('/', tableController.create);
router.delete('/:id', tableController.delete);
router.patch('/:id/status', tableController.updateStatus);

module.exports = router;