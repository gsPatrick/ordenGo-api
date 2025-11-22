const express = require('express');
const restaurantController = require('./restaurant.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const appearanceUpload = upload.fields([
  { name: 'institutionalBanners', maxCount: 10 },
  { name: 'highlightImagesLarge', maxCount: 5 },
  { name: 'highlightImagesSmall', maxCount: 2 }
]);


const router = express.Router();

// Segurança Global para estas rotas
router.use(protect);
router.use(restrictTo('manager', 'admin')); // Apenas gerentes podem editar

// Leitura
router.get('/', restaurantController.getSettings);




// Atualizações
router.patch('/appearance', appearanceUpload, restaurantController.updateAppearance);
router.patch('/general', restaurantController.updateGeneral);

// Upload de Logo (usa o middleware do Multer 'single')
router.post('/logo', upload.single('logo'), restaurantController.uploadLogo);

module.exports = router;