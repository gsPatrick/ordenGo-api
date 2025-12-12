const express = require('express');
const menuController = require('./menu.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');
const upload = require('../../utils/upload');

const categoryUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'banners', maxCount: 5 }
]);


const router = express.Router();

// ============================================================
// ROTA PÚBLICA (Para o Tablet - Sem Login)
// ============================================================
// O tablet chama /api/v1/menu/public/:restaurantId
router.get('/public/:restaurantId', (req, res, next) => {
  req.restaurantId = req.params.restaurantId;
  next();
}, menuController.getMenu);


// ============================================================
// ROTAS PROTEGIDAS (Equipe Logada)
// ============================================================
router.use(protect); // Exige token válido

// --- ROTAS DE LEITURA (Liberadas para Garçom, Gerente e Admin) ---
// O Garçom precisa ver o menu para lançar pedidos
router.get('/', restrictTo('manager', 'admin', 'waiter'), menuController.getMenu);
router.get('/modifiers', restrictTo('manager', 'admin', 'waiter'), menuController.listModifiers);


// --- ROTAS DE ESCRITA (Apenas Gerentes e Admins) ---
// Daqui para baixo, Garçom NÃO passa
router.use(restrictTo('manager', 'admin'));

// Categorias
router.patch('/categories/reorder', menuController.reorderCategories); // MOVED UP to avoid conflict with :id
router.post('/categories', categoryUpload, menuController.createCategory);
router.patch('/categories/:id', categoryUpload, menuController.updateCategory);
router.delete('/categories/:id', menuController.deleteCategory);

// Produtos
router.patch('/products/reorder', menuController.reorderProducts); // MOVED UP to avoid conflict with :id
router.post('/products', upload.single('image'), menuController.createProduct);
router.patch('/products/:id', upload.single('image'), menuController.updateProduct);
router.delete('/products/:id', menuController.deleteProduct);
router.patch('/products/:id/availability', menuController.toggleAvailability); // "86 it" rápido

// Modificadores (Escrita)
router.post('/modifiers', menuController.createModifierGroup);
router.patch('/modifiers/:id', menuController.updateModifierGroup);
router.delete('/modifiers/:id', menuController.deleteModifierGroup);

router.get('/products', restrictTo('manager', 'admin', 'waiter'), menuController.listProducts);


module.exports = router;