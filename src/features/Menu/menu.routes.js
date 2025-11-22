const express = require('express');
const menuController = require('./menu.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const router = express.Router();

// ============================================================
// ROTA PÚBLICA (Para o Tablet)
// ============================================================
// O tablet chama /api/menu/public/:restaurantId (ou usa o token da mesa em outra rota)
// Aqui vamos permitir listar se tiver o ID.
router.get('/public/:restaurantId', (req, res, next) => {
    req.restaurantId = req.params.restaurantId; // Injeta ID manualmente para o controller funcionar
    next();
}, menuController.getMenu);


// ============================================================
// ROTAS PROTEGIDAS (Gerente)
// ============================================================
router.use(protect);
router.use(restrictTo('manager', 'admin'));

// Categorias
router.post('/categories', upload.single('image'), menuController.createCategory);
router.patch('/categories/:id', upload.single('image'), menuController.updateCategory);

// Produtos
router.post('/products', upload.single('image'), menuController.createProduct);
router.patch('/products/:id/availability', menuController.toggleAvailability); // "86 it" rápido

// Modificadores
router.get('/modifiers', menuController.listModifiers);
router.post('/modifiers', menuController.createModifierGroup);

// Leitura interna (para o painel admin preencher as tabelas)
router.get('/', menuController.getMenu);

module.exports = router;