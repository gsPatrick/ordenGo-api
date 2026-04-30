const { AuditLog } = require('../models');

/**
 * Middleware para registrar ações sensíveis no AuditLog
 * @param {string} action Nome da ação (ex: "DELETE_TENANT", "UPDATE_SETTINGS")
 */
exports.logAction = (action) => {
  return async (req, res, next) => {
    // Executa a gravação do log de forma assíncrona (não bloqueia a resposta)
    const userId = req.user ? req.user.id : null;
    
    // Tenta pegar o IP real, mesmo atrás de proxy (Nginx/Cloudflare)
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Captura detalhes relevantes da requisição
    const details = {
      method: req.method,
      url: req.originalUrl,
      // Salva o body apenas se não for GET, para não poluir o log
      body: req.method !== 'GET' ? { ...req.body } : {}, 
      params: req.params,
      query: req.query
    };

    // --- SANITIZAÇÃO DE DADOS SENSÍVEIS ---
    // Nunca salvar senhas em texto puro nos logs!
    const sensitiveFields = ['password', 'passwordConfirm', 'managerPassword', 'pin', 'stripe_secret_key'];
    
    if (details.body) {
      sensitiveFields.forEach(field => {
        if (details.body[field]) details.body[field] = '***OCULTADO***';
      });
    }

    try {
      await AuditLog.create({
        userId,
        action,
        targetResource: req.originalUrl,
        ipAddress,
        details
      });
    } catch (err) {
      // Não queremos que um erro de log pare a aplicação, apenas avisamos no console
      console.error('⚠️ Falha ao gravar log de auditoria:', err.message);
    }

    next();
  };
};