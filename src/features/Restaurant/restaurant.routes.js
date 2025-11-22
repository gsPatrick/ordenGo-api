const express = require('express');
const restaurantController = require('./restaurant.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

// ============================================================
// ROTA PÚBLICA (Tablet / Cardápio Digital)
// ============================================================
// Permite pegar as cores e logo sem estar logado
// GET /api/v1/settings/public/:restaurantId
router.get('/public/:restaurantId', (req, res, next) => {
    req.restaurantId = req.params.restaurantId; // Injeta o ID manualmente
    next();
}, restaurantController.getSettings);


// ============================================================
// ROTAS PROTEGIDAS (Gerente / Admin)
// ============================================================
router.use(protect); // <--- O BLOQUEIO COMEÇA AQUI
router.use(restrictTo('manager', 'admin'));

// Leitura interna
router.get('/', restaurantController.getSettings);

// Configuração do Multer para múltiplos campos (Appearance)
const appearanceUpload = upload.fields([
  { name: 'institutionalBanners', maxCount: 10 },
  { name: 'highlightImagesLarge', maxCount: 5 },
  { name: 'highlightImagesSmall', maxCount: 2 }
]);

router.patch('/appearance', appearanceUpload, restaurantController.updateAppearance);
router.patch('/general', restaurantController.updateGeneral);
router.post('/logo', upload.single('logo'), restaurantController.uploadLogo);

// Rota coringa para updates simples
router.patch('/', upload.any(), async (req, res, next) => {
    return restaurantController.updateGeneral(req, res, next);
});

module.exports = router;