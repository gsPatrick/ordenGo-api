const { sequelize, User, Role, Permission, Restaurant, RestaurantConfig, TableSession, RestaurantDocument, RestaurantNote } = require('../src/models');
const { DataTypes } = require('sequelize');

async function runMigrations() {
    try {
        console.log('🚀 Iniciando Master Migration (Consolidada)...');
        const queryInterface = sequelize.getQueryInterface();

        // ---------------------------------------------------------
        // 1. Migração V2 (Categories, Products, Restaurants, TableSessions)
        // ---------------------------------------------------------
        console.log('--- Fase 1 (Core Columns) ---');
        const categoriesDef = await queryInterface.describeTable('Categories');
        if (!categoriesDef.order) {
            await sequelize.query(`ALTER TABLE "Categories" ADD COLUMN "order" INTEGER DEFAULT 0;`);
            console.log('✅ Added "order" to Categories.');
        }

        const productsDef = await queryInterface.describeTable('Products');
        if (!productsDef.order) {
            await sequelize.query(`ALTER TABLE "Products" ADD COLUMN "order" INTEGER DEFAULT 0;`);
            console.log('✅ Added "order" to Products.');
        }
        if (!productsDef.gallery) {
            await sequelize.query(`ALTER TABLE "Products" ADD COLUMN "gallery" TEXT[] DEFAULT \'{}\';`);
            console.log('✅ Added "gallery" to Products.');
        }

        const restaurantsDef = await queryInterface.describeTable('Restaurants');
        if (!restaurantsDef.accessCode) {
            await sequelize.query(`ALTER TABLE "Restaurants" ADD COLUMN "accessCode" VARCHAR(10);`);
            await sequelize.query(`ALTER TABLE "Restaurants" ADD CONSTRAINT "Restaurants_accessCode_key" UNIQUE ("accessCode");`);
            console.log('✅ Added "accessCode" to Restaurants.');
        }

        // ---------------------------------------------------------
        // 2. Migração V6 (Campos Europeus / SaaS Pro)
        // ---------------------------------------------------------
        console.log('--- Fase 2 (SaaS / Europe Fields) ---');
        const restaurantColumns = [
            { name: 'taxId', type: 'VARCHAR(255)' },
            { name: 'billingAddress', type: 'TEXT' },
            { name: 'fullAddress', type: 'TEXT' },
            { name: 'contactPerson', type: 'VARCHAR(255)' },
            { name: 'timezone', type: 'VARCHAR(255) DEFAULT \'Europe/Madrid\'' },
            { name: 'country', type: 'VARCHAR(2) DEFAULT \'ES\'' },
            { name: 'contractStartDate', type: 'DATEONLY' },
            { name: 'contractRenewalDate', type: 'DATEONLY' },
            { name: 'autoRenew', type: 'BOOLEAN DEFAULT true' },
            { name: 'isOnboardingCompleted', type: 'BOOLEAN DEFAULT false' },
            { name: 'locales', type: 'TEXT[] DEFAULT \'{es-ES,en-US,de-DE,it-IT,fr-FR,pt-PT}\'' }
        ];

        for (const col of restaurantColumns) {
            if (!restaurantsDef[col.name]) {
                await sequelize.query(`ALTER TABLE "Restaurants" ADD COLUMN "${col.name}" ${col.type};`);
                console.log(`✅ Coluna "${col.name}" adicionada em Restaurants.`);
            }
        }

        // ---------------------------------------------------------
        // 3. Migração V3 & V4 (Screensaver & Gallery)
        // ---------------------------------------------------------
        console.log('--- Fase 3 (Features: Screensaver & Gallery) ---');
        
        // Tabela ClientAds
        const clientAdsExists = await queryInterface.tableExists('ClientAds');
        if (!clientAdsExists) {
            await queryInterface.createTable('ClientAds', {
                id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
                restaurantId: { 
                    type: DataTypes.UUID, 
                    allowNull: false, 
                    references: { model: 'Restaurants', key: 'id' },
                    onUpdate: 'CASCADE', onDelete: 'CASCADE'
                },
                imageUrl: { type: DataTypes.STRING, allowNull: false },
                isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
                order: { type: DataTypes.INTEGER, defaultValue: 0 },
                createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
                updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
            });
            console.log('✅ Tabela ClientAds criada.');
        }

        // Colunas em RestaurantConfigs
        const configTable = await queryInterface.describeTable('RestaurantConfigs');
        const configCols = [
            { name: 'screensaverEnabled', type: 'BOOLEAN DEFAULT true' },
            { name: 'screensaverIdleTime', type: 'INTEGER DEFAULT 120' },
            { name: 'screensaverAdminBatchSize', type: 'INTEGER DEFAULT 3' },
            { name: 'screensaverClientBatchSize', type: 'INTEGER DEFAULT 1' }
        ];

        for (const col of configCols) {
            if (!configTable[col.name]) {
                await sequelize.query(`ALTER TABLE "RestaurantConfigs" ADD COLUMN "${col.name}" ${col.type};`);
                console.log(`✅ Coluna "${col.name}" adicionada em RestaurantConfigs.`);
            }
        }

        // ---------------------------------------------------------
        // 4. Migração V5 (RBAC)
        // ---------------------------------------------------------
        console.log('--- Fase 4 (RBAC) ---');
        await Role.sync();
        await Permission.sync();
        
        const usersDef = await queryInterface.describeTable('Users');
        if (!usersDef.roleId) {
            await sequelize.query(`ALTER TABLE "Users" ADD COLUMN "roleId" UUID REFERENCES "Roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
            console.log('✅ Coluna "roleId" adicionada em Users.');
        }

        // ---------------------------------------------------------
        // 5. Tabelas Adicionais (Sync com alter: true)
        // ---------------------------------------------------------
        console.log('--- Fase 5 (Syncing Tables) ---');
        await TableSession.sync({ alter: true });
        await RestaurantDocument.sync({ alter: true });
        await RestaurantNote.sync({ alter: true });
        await sequelize.sync(); // Garante junções como RolePermissions

        // ---------------------------------------------------------
        // 6. Seeding de RBAC (Permissões e Roles)
        // ---------------------------------------------------------
        console.log('--- Fase 6 (Seeding RBAC) ---');
        const permissions = [
            { slug: 'view_dashboard', name: 'Ver Panel de Control', group: 'Dashboard' },
            { slug: 'view_tenants', name: 'Ver Clientes', group: 'Clientes' },
            { slug: 'manage_tenants', name: 'Gestionar Clientes', group: 'Clientes' },
            { slug: 'view_ads', name: 'Ver Anuncios/Campañas', group: 'Publicidad' },
            { slug: 'manage_ads', name: 'Gestionar Anuncios', group: 'Publicidad' },
            { slug: 'view_finance', name: 'Ver Financiero', group: 'Finanzas' },
            { slug: 'manage_finance', name: 'Gestionar Facturas/Pagos', group: 'Finanzas' },
            { slug: 'manage_team', name: 'Gestionar Equipo SaaS', group: 'Plataforma' },
            { slug: 'manage_roles', name: 'Gestionar Cargos y Permisos', group: 'Plataforma' },
            { slug: 'manage_smtp', name: 'Configurar SMTP', group: 'Plataforma' },
            { slug: 'manage_branding', name: 'Gestionar Branding Global/App', group: 'Sistema' },
            { slug: 'view_logs', name: 'Ver Logs del Sistema', group: 'Sistema' },
            { slug: 'manage_settings', name: 'Configuraciones Globales', group: 'Sistema' },
        ];

        for (const p of permissions) {
            await Permission.findOrCreate({ where: { slug: p.slug }, defaults: p });
            // Atualizar nomes existentes para espanhol se necessário
            await Permission.update({ name: p.name, group: p.group }, { where: { slug: p.slug } });
        }

        const systemRoles = [
            { name: 'Super Admin', description: 'Acceso total al sistema', isSystem: true },
            { name: 'Soporte Técnico', description: 'Acceso a clientes, anuncios y logs', isSystem: false },
            { name: 'Financiero', description: 'Acceso exclusivo al módulo financiero y reportes', isSystem: false },
        ];

        for (const r of systemRoles) {
            const [role] = await Role.findOrCreate({ where: { name: r.name }, defaults: r });
            // Atualizar nomes existentes
            await Role.update({ description: r.description }, { where: { name: r.name } });
            
            if (r.name === 'Super Admin') {
                const allPerms = await Permission.findAll();
                await role.setPermissions(allPerms);
            }
        }
        console.log('✅ RBAC Seeded.');

        console.log('✨ Master Migration concluída com sucesso.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Master Migration falhou:', error);
        process.exit(1);
    }
}

runMigrations();
