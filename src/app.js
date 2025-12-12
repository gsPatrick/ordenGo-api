require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Necessário para hash da senha
const { sequelize, User, Restaurant, RestaurantConfig } = require('./models');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/error.controller');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

// ============================================================
// 1. CONFIGURAÇÃO DO SOCKET.IO (CORS LIBERADO)
// ============================================================
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket conectado: ${socket.id}`);

  socket.on('join_room', (data) => {
    if (data.type === 'waiter' || data.type === 'kitchen') {
      const room = `restaurant_${data.restaurantId}`;
      socket.join(room);
      console.log(`👨‍🍳 Socket ${socket.id} entrou na sala: ${room}`);
    }
    else if (data.type === 'table') {
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
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ============================================================
// 3. ROTAS
// ============================================================
app.use('/api/v1', routes);

app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Não foi possível encontrar ${req.originalUrl} neste servidor!`, 404));
});

app.use(globalErrorHandler);

// ============================================================
// 4. FUNÇÃO DE SEED AUTOMÁTICO (SUPER ADMIN)
// ============================================================
async function createDefaultSuperAdmin() {
  try {
    const email = 'superadmin@gmail.com';
    const passwordPlain = 'superadmin123';

    // 1. Verifica se o usuário já existe
    const adminExists = await User.findOne({ where: { email } });
    if (adminExists) {
      console.log('✅ Super Admin já existe no banco de dados.');
      return;
    }

    console.log('⚡ Criando Super Admin padrão...');

    // 2. Verifica/Cria o Restaurante "HQ" (SaaS Admin precisa estar vinculado a algo)
    let hq = await Restaurant.findOne({ where: { slug: 'ordengo-admin' } });

    if (!hq) {
      hq = await Restaurant.create({
        name: 'OrdenGo HQ',
        slug: 'ordengo-admin', // Slug reservado
        isActive: true,
        planType: 'enterprise',
        currency: 'BRL'
      });

      // Cria config padrão para não quebrar se ele tentar acessar settings
      await RestaurantConfig.create({
        restaurantId: hq.id,
        primaryColor: '#000000',
        backgroundColor: '#ffffff'
      });
    }

    // 3. Cria o Usuário
    const hashedPassword = await bcrypt.hash(passwordPlain, 12);

    await User.create({
      restaurantId: hq.id,
      name: 'Super Admin',
      email: email,
      password: hashedPassword,
      role: 'superadmin' // Role especial
    });

    console.log(`👑 Super Admin criado com sucesso!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${passwordPlain}`);

  } catch (error) {
    console.error('❌ Erro ao criar Super Admin automático:', error);
  }
}

// ============================================================
// 5. INICIALIZAÇÃO DO SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;

sequelize.sync()
  .then(async () => {
    console.log('💾 Banco de dados conectado e sincronizado.');
    // Executa a verificação/criação do Admin

    await createDefaultSuperAdmin();

    server.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📡 Socket.io pronto (CORS: *)`);
    });
  })
  .catch(err => {
    console.error('❌ Erro ao conectar no banco de dados:', err);
  });