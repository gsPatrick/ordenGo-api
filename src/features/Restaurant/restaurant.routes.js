const express = require('express');
const restaurantController = require('./restaurant.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

// Segurança Global para estas rotas
router.use(protect);
router.use(restrictTo('manager', 'admin')); // Apenas gerentes podem editar

// Leitura
router.get('/', restaurantController.getSettings);

// Atualizações
router.patch('/appearance', restaurantController.updateAppearance);
router.patch('/general', restaurantController.updateGeneral);

// Upload de Logo (usa o middleware do Multer 'single')
router.post('/logo', upload.single('logo'), restaurantController.uploadLogo);

module.exports = router;