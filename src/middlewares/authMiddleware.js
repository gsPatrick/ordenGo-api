const { AuditLog } = require('../models');

/**
 * Middleware para registrar ações sensíveis no AuditLog
 * @param {string} action Nome da ação (ex: "DELETE_TENANT")
 */
exports.logAction = (action) => {
  return async (req, res, next) => {
    // Armazena o original 'res.send' para interceptar a resposta se necessário,
    // mas para simplificar, vamos gravar "antes" de executar (tentativa) 
    // ou usar um hook "on finish".
    
    // Vamos gravar de forma assíncrona (Fire & Forget) para não travar a request
    const userId = req.user ? req.user.id : null;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Captura detalhes relevantes
    const details = {
      method: req.method,
      url: req.originalUrl,
      body: req.method !== 'GET' ? req.body : {}, // Cuidado com senhas no body!
      params: req.params,
      query: req.query
    };

    // Remove campos sensíveis do log
    if (details.body.password) details.body.password = '***';
    if (details.body.managerPassword) details.body.managerPassword = '***';

    try {
      await AuditLog.create({
        userId,
        action,
        targetResource: req.originalUrl,
        ipAddress,
        details
      });
    } catch (err) {
      console.error('Falha ao gravar log de auditoria:', err);
    }

    next();
  };
};