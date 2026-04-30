const sequelize = require('../src/config/database');
const { DataTypes } = require('sequelize');

async function migrate_v3() {
    console.log('🔄 Iniciando Migração V3 (Screensaver)...');

    try {
        const queryInterface = sequelize.getQueryInterface();

        // 1. Criar Tabela ClientAds
        const tableExists = await queryInterface.tableExists('ClientAds');
        if (!tableExists) {
            await queryInterface.createTable('ClientAds', {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                restaurantId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: {
                        model: 'Restaurants', // Nome da tabela
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                imageUrl: {
                    type: DataTypes.STRING,
                    allowNull: false,
                },
                isActive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true,
                },
                order: {
                    type: DataTypes.INTEGER,
                    defaultValue: 0,
                },
                createdAt: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                },
                updatedAt: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                }
            });
            console.log('✅ Tabela ClientAds criada.');
        } else {
            console.log('ℹ️ Tabela ClientAds já existe.');

            // Se existir, garantir que colunas existem (caso tenha sido criada manualmente sem tudo)
            const description = await queryInterface.describeTable('ClientAds');
            if (!description.order) {
                await queryInterface.addColumn('ClientAds', 'order', {
                    type: DataTypes.INTEGER,
                    defaultValue: 0
                });
                console.log('✅ Coluna order adicionada em ClientAds.');
            }
        }

        // 2. Adicionar Colunas em RestaurantConfigs
        const configTable = await queryInterface.describeTable('RestaurantConfigs');

        if (!configTable.screensaverEnabled) {
            await queryInterface.addColumn('RestaurantConfigs', 'screensaverEnabled', {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            });
            console.log('✅ screensaverEnabled adicionado.');
        }

        if (!configTable.screensaverIdleTime) {
            await queryInterface.addColumn('RestaurantConfigs', 'screensaverIdleTime', {
                type: DataTypes.INTEGER,
                defaultValue: 120 // 2 minutos padrão
            });
            console.log('✅ screensaverIdleTime adicionado.');
        }

        if (!configTable.screensaverAdminBatchSize) {
            await queryInterface.addColumn('RestaurantConfigs', 'screensaverAdminBatchSize', {
                type: DataTypes.INTEGER,
                defaultValue: 3 // Padrão 3 admins
            });
            console.log('✅ screensaverAdminBatchSize adicionado.');
        }

        if (!configTable.screensaverClientBatchSize) {
            await queryInterface.addColumn('RestaurantConfigs', 'screensaverClientBatchSize', {
                type: DataTypes.INTEGER,
                defaultValue: 1 // Padrão 1 cliente
            });
            console.log('✅ screensaverClientBatchSize adicionado.');
        }

        console.log('✅ Migração V3 concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro na Migração V3:', error);
    } finally {
        process.exit();
    }
}

migrate_v3();
