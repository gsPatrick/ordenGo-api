// src/utils/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('./AppError');

// Cria a pasta caso não exista
const ensureDirectoryExistence = (filePath) => {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true });
  }
};

// Configuração de armazenamento (sem limites)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'public/uploads';
    
    ensureDirectoryExistence(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const id = req.restaurantId || 'unknown';

    // tenta pegar extensão do mimetype, senão usa a original
    const ext =
      file.mimetype?.split('/')[1] ||
      path.extname(file.originalname).replace('.', '') ||
      'bin';

    const uniqueSuffix = `restaurant-${id}-${Date.now()}.${ext}`;
    cb(null, uniqueSuffix);
  }
});

// Sem filtro → aceita qualquer arquivo
const multerFilter = (req, file, cb) => {
  cb(null, true);
};

// Upload ilimitado (sem limites de tamanho)
const upload = multer({
  storage: storage,
  fileFilter: multerFilter,
  limits: {} // vazio = sem limite
});

module.exports = upload;
