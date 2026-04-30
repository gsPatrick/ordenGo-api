const { SystemSetting } = require('../../models');
const AppError = require('../../utils/AppError');

/**
 * Busca todas as configurações agrupadas
 * Oculta valores sensíveis se solicitado
 */
exports.getAllSettings = async (revealSecrets = false) => {
  const settings = await SystemSetting.findAll();
  
  const formatted = {};
  
  settings.forEach(s => {
    // Se não for para revelar segredos e a chave parecer sensível, mascara
    let val = s.value;
    if (!revealSecrets && !s.isPublic && (s.key.includes('secret') || s.key.includes('password') || s.key.includes('key'))) {
      val = val ? '********' : '';
    }
    
    formatted[s.key] = val;
  });

  return formatted;
};

/**
 * Atualiza ou Cria configurações em massa
 */
exports.updateSettings = async (data) => {
  // data: { stripe_secret_key: "sk_test...", smtp_host: "smtp.gmail.com" }
  
  const transaction = await require('../../models').sequelize.transaction();

  try {
    const keys = Object.keys(data);

    for (const key of keys) {
      let value = data[key];
      
      // Se o valor for '********', ignoramos (significa que o usuário não alterou o segredo no front)
      if (value === '********') continue;

      // Definir grupo baseado no prefixo da chave (Lógica auxiliar)
      let group = 'general';
      if (key.startsWith('stripe_') || key.startsWith('paypal_')) group = 'payment';
      if (key.startsWith('smtp_') || key.startsWith('sendgrid_')) group = 'email';

      // Upsert (PostgreSQL/Sequelize)
      await SystemSetting.upsert({
        key,
        value: String(value),
        group
      }, { transaction });
    }

    await transaction.commit();
    return await exports.getAllSettings(false); // Retorna valores mascarados

  } catch (error) {
    await transaction.rollback();
    throw new AppError('Erro ao salvar configurações globais.', 500);
  }
};

/**
 * Helper interno para pegar uma config específica (usado por outros services, ex: Financeiro)
 */
exports.getValue = async (key) => {
  const setting = await SystemSetting.findByPk(key);
  return setting ? setting.value : null;
};