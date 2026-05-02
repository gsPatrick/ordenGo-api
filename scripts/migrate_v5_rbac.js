const { sequelize, User, Role, Permission } = require('../src/models');

async function migrate() {
    try {
        console.log('🚀 Iniciando Migração V5 (RBAC & User Roles)...');

        // 1. Criar tabelas Roles e Permissions se não existirem
        await Role.sync();
        console.log('✅ Tabela Roles sincronizada.');
        
        await Permission.sync();
        console.log('✅ Tabela Permissions sincronizada.');

        // 2. Adicionar coluna roleId na tabela Users
        try {
            await sequelize.query(`ALTER TABLE "Users" ADD COLUMN "roleId" UUID REFERENCES "Roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
            console.log('✅ Coluna "roleId" adicionada à tabela Users.');
        } catch (error) {
            if (error.original && error.original.code === '42701') {
                console.log('ℹ️ Coluna "roleId" já existe na tabela Users.');
            } else {
                console.error('❌ Erro ao adicionar coluna "roleId":', error.message);
            }
        }

        // 3. Sincronizar a tabela de junção RolePermissions
        // Como o Sequelize cria essa tabela automaticamente através do belongsToMany,
        // chamamos o sync do sequelize para garantir que todas as associações sejam criadas.
        await sequelize.sync(); 
        console.log('✅ Todas as associações (incluindo RolePermissions) sincronizadas.');

        console.log('✨ Migração V5 concluída com sucesso.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Falha na migração V5:', error);
        process.exit(1);
    }
}

migrate();
