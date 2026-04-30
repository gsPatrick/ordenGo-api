const { AuditLog, User } = require('../../models');

/**
 * Lista logs de auditoria para o painel
 */
exports.getLogs = async (limit = 100) => {
  return await AuditLog.findAll({
    include: [
      { model: User, attributes: ['name', 'email', 'role'] }
    ],
    order: [['createdAt', 'DESC']],
    limit
  });
};
