const express = require('express');
const restaurantController = require('./restaurant.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');
const { Table } = require('../../models'); // Precisamos buscar a mesa se for acesso via Token
const AppError = require('../../utils/AppError');

const router = express.Router();

// ============================================================
// MIDDLEWARE HÍBRIDO (Token de Mesa OU Login de Gerente)
// ============================================================
const resolveAuthOrTableToken = async (req, res, next) => {
  // 1. Se tiver Header de Token da Mesa (x-table-token), tenta autenticar como Mesa
  const tableToken = req.headers['x-table-token'];
  
  if (tableToken) {
    const table = await Table.findOne({ where: { qrCodeToken: tableToken } });
    if (table) {
      req.restaurantId = table.restaurantId; // Injeta o ID do restaurante
      return next(); // Passa direto, sem exigir login
    }
  }

  // 2. Se não tiver token de mesa, ou for inválido, tenta autenticação normal (Bearer Token)
  // Chama o middleware 'protect' manualmente
  return protect(req, res, next);
};


// ============================================================
// ROTA HÍBRIDA (Leitura)
// ============================================================
// Agora aceita tanto o Gerente (JWT) quanto o Tablet (x-table-token)
router.get('/', resolveAuthOrTableToken, restaurantController.getSettings);

// Rota Pública Explícita (caso queira usar via ID na URL)
router.get('/public/:restaurantId', (req, res, next) => {
    req.restaurantId = req.params.restaurantId;
    next();
}, restaurantController.getSettings);


// ============================================================
// ROTAS ESTRITAMENTE PROTEGIDAS (Escrita - Apenas Gerente)
// ============================================================
// Daqui para baixo, exigimos login REAL de gerente, pois Tablet não pode editar configurações
router.use(protect); 
router.use(restrictTo('manager', 'admin'));

// Configuração do Multer para múltiplos campos
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