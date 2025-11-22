// src/utils/upload.js
const multer = require('multer');
const path = require('path');
const AppError = require('./AppError');

// Configuração de Armazenamento Local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Certifique-se de criar a pasta 'public/uploads' na raiz do projeto
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    // Nome único: restaurant-{id}-{timestamp}.ext
    const ext = file.mimetype.split('/')[1];
    const uniqueSuffix = `restaurant-${req.restaurantId}-${Date.now()}.${ext}`;
    cb(null, uniqueSuffix);
  }
});

// Filtro para aceitar apenas Imagens
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Não é uma imagem! Por favor faça upload apenas de imagens.', 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});

module.exports = upload;