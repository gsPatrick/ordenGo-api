const { sequelize, Role, Permission } = require('../src/models');

async function seedRBAC() {
  try {
    console.log('🚀 Iniciando seeding de RBAC...');

    const permissions = [
      // Dashboard
      { slug: 'view_dashboard', name: 'Ver Dashboard', group: 'Dashboard' },
      
      // Clientes (Tenants)
      { slug: 'view_tenants', name: 'Ver Clientes', group: 'Clientes' },
      { slug: 'manage_tenants', name: 'Gerenciar Clientes', group: 'Clientes' },
      
      // Publicidade
      { slug: 'view_ads', name: 'Ver Anúncios/Campanhas', group: 'Publicidade' },
      { slug: 'manage_ads', name: 'Gerenciar Anúncios', group: 'Publicidade' },
      
      // Financeiro
      { slug: 'view_finance', name: 'Ver Financeiro', group: 'Financeiro' },
      { slug: 'manage_finance', name: 'Gerenciar Faturas/Pagamentos', group: 'Financeiro' },
      
      // Plataforma
      { slug: 'manage_team', name: 'Gerenciar Equipe SaaS', group: 'Plataforma' },
      { slug: 'manage_roles', name: 'Gerenciar Cargos e Permissões', group: 'Plataforma' },
      { slug: 'manage_smtp', name: 'Configurar SMTP', group: 'Plataforma' },
      
      // Sistema
      { slug: 'manage_branding', name: 'Gerenciar Branding Global/App', group: 'Sistema' },
      { slug: 'view_logs', name: 'Ver Logs do Sistema', group: 'Sistema' },
      { slug: 'manage_settings', name: 'Configurações Globais', group: 'Sistema' },
    ];

    // 1. Criar Permissões
    for (const p of permissions) {
      await Permission.findOrCreate({
        where: { slug: p.slug },
        defaults: p
      });
    }
    console.log('✅ Permissões semeadas.');

    // 2. Criar Roles do Sistema
    const roles = [
      { name: 'Super Admin', description: 'Acesso total ao sistema', isSystem: true },
      { name: 'Soporte Técnico', description: 'Acesso a clientes, anúncios e logs', isSystem: false },
      { name: 'Financiero', description: 'Acesso exclusivo ao módulo financeiro e relatórios', isSystem: false },
    ];

    for (const r of roles) {
      const [role] = await Role.findOrCreate({
        where: { name: r.name },
        defaults: r
      });

      // Atribuir permissões baseadas no nome (simplificado para o seed)
      if (r.name === 'Super Admin') {
        const allPerms = await Permission.findAll();
        await role.setPermissions(allPerms);
      } else if (r.name === 'Soporte Técnico') {
        const supportPerms = await Permission.findAll({
          where: { group: ['Dashboard', 'Clientes', 'Publicidade', 'Sistema'] }
        });
        await role.setPermissions(supportPerms);
      } else if (r.name === 'Financiero') {
        const financePerms = await Permission.findAll({
          where: { group: ['Dashboard', 'Financeiro'] }
        });
        await role.setPermissions(financePerms);
      }
    }
    console.log('✅ Roles semeadas e vinculadas.');

    console.log('✨ Seeding de RBAC concluído com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no seeding:', error);
    process.exit(1);
  }
}

seedRBAC();
