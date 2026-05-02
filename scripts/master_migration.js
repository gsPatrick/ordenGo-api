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

        console.log('✨ Master Migration concluída com sucesso.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Master Migration falhou:', error);
        process.exit(1);
    }
}

runMigrations();
