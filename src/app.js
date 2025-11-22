require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const { sequelize } = require('./models');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/error.controller');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

// ============================================================
// 1. CONFIGURAÇÃO DO SOCKET.IO
// ============================================================
const io = socketIo(server, {
  cors: {
    origin: "*", // Em produção, mude para o domínio do seu frontend (ex: https://app.ordengo.com)
    methods: ["GET", "POST"]
  }
});

// Middleware para injetar o 'io' em todas as requisições HTTP
// Isso permite chamar req.io.emit() dentro dos Controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Lógica de Conexão Real-Time
io.on('connection', (socket) => {
  console.log(`🔌 Socket conectado: ${socket.id}`);

  // Evento para entrar em uma sala (Room)
  // O Frontend deve emitir 'join_room' logo após conectar
  socket.on('join_room', (data) => {
    // data esperada: { restaurantId, type, tableId }
    // type: 'waiter' | 'kitchen' | 'table'

    if (data.type === 'waiter' || data.type === 'kitchen') {
      // Garçons e Cozinha ouvem tudo do restaurante
      const room = `restaurant_${data.restaurantId}`;
      socket.join(room);
      console.log(`👨‍🍳 Socket ${socket.id} entrou na sala: ${room}`);
    } 
    else if (data.type === 'table') {
      // Tablet da mesa ouve apenas coisas daquela mesa
      const room = `table_${data.tableId}`;
      socket.join(room);
      console.log(`📱 Socket ${socket.id} entrou na sala: ${room}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket desconectado: ${socket.id}`);
  });
});

// ============================================================
// 2. MIDDLEWARES GLOBAIS
// ============================================================

// CORS - Permitir acesso do Frontend
app.use(cors());

// Body Parser - Ler JSON e FormUrlEncoded
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Servir Arquivos Estáticos (Imagens de Upload)
// Acessível em: http://localhost:3000/uploads/nome-da-imagem.jpg
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ============================================================
// 3. ROTAS
// ============================================================

// Prefixo da API
app.use('/api/v1', routes);

// Tratamento para rotas não encontradas (404)
app.all('*', (req, res, next) => {
  next(new AppError(`Não foi possível encontrar ${req.originalUrl} neste servidor!`, 404));
});

// Handler Global de Erros
app.use(globalErrorHandler);

// ============================================================
// 4. INICIALIZAÇÃO DO SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;

// Sincroniza o banco de dados e inicia o servidor
// { alter: true } atualiza tabelas se mudar models (bom para dev, cuidado em prod)
sequelize.sync({ alter: true }) 
  .then(() => {
    console.log('💾 Banco de dados conectado e sincronizado.');
    server.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📡 Socket.io pronto para conexões.`);
    });
  })
  .catch(err => {
    console.error('❌ Erro ao conectar no banco de dados:', err);
  });