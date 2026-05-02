const sequelize = require('../src/config/database');

async function migrate() {
    try {
        console.log('🚀 Iniciando Migração V6 (Campos adicionais do Restaurante)...');

        const queryInterface = sequelize.getQueryInterface();
        const tableDefinition = await queryInterface.describeTable('Restaurants');

        const columnsToAdd = [
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

        for (const col of columnsToAdd) {
            if (!tableDefinition[col.name]) {
                try {
                    await sequelize.query(`ALTER TABLE "Restaurants" ADD COLUMN "${col.name}" ${col.type};`);
                    console.log(`✅ Coluna "${col.name}" adicionada.`);
                } catch (err) {
                    console.error(`❌ Erro ao adicionar coluna "${col.name}":`, err.message);
                }
            } else {
                console.log(`ℹ️ Coluna "${col.name}" já existe.`);
            }
        }

        console.log('✨ Migração V6 concluída com sucesso.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Falha na migração V6:', error);
        process.exit(1);
    }
}

migrate();
