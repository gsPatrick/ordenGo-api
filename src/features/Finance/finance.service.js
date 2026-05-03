const { 
  Invoice, 
  LedgerEntry, 
  Restaurant, 
  Plan, 
  Region, 
  Advertiser, 
  CashReport,
  SessionPayment,
  TableSession,
  sequelize 
} = require('../../models');
const AppError = require('../../utils/AppError');
const { Op } = require('sequelize');

// ============================================================
// GERAÇÃO DE FATURAS (SaaS)
// ============================================================

/**
 * Gera uma fatura de assinatura SaaS para um restaurante
 */
exports.generateSaaSInvoice = async (restaurantId, dueDate) => {
  const restaurant = await Restaurant.findByPk(restaurantId, {
    include: [
      { model: Plan },
      { model: Region } // Necessário para saber a taxa de imposto
    ]
  });

  if (!restaurant || !restaurant.Plan) {
    throw new AppError('Restaurante ou Plano não encontrado.', 404);
  }

  // 1. Definição de Valores
  const subtotal = Number(restaurant.Plan.priceMonthly);
  const currency = restaurant.currency || 'EUR';
  
  // 2. Lógica Fiscal (Europa)
  let taxRate = 21.00; 
  let taxName = 'IVA'; // Fallback padrão

  if (restaurant.Region) {
    if (restaurant.Region.taxRule !== null) {
      taxRate = Number(restaurant.Region.taxRule);
    }
    // Busca o nome do imposto direto do cadastro da região (ex: "IGIC", "MwSt")
    if (restaurant.Region.taxName) {
      taxName = restaurant.Region.taxName;
    }
  }

  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // 3. Criar Fatura (Draft)
  const invoice = await Invoice.create({
    type: 'saas_subscription',
    restaurantId: restaurant.id,
    total: total, // Valor Final
    subtotal: subtotal,
    taxName: taxName,
    taxRate: taxRate,
    taxAmount: taxAmount,
    currency: currency,
    status: 'sent', // Assumindo envio automático
    dueDate: dueDate || new Date()
  });

  return invoice;
};

/**
 * Dispara a geração em massa para todos os ativos (Rotina Mensal)
 */
exports.generateMonthlyInvoices = async () => {
  const activeRestaurants = await Restaurant.findAll({
    where: { isActive: true },
    include: [{ model: Plan }]
  });

  const results = { generated: 0, errors: 0 };
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30); // Vence em 30 dias

  for (const rest of activeRestaurants) {
    // Ignora quem não tem plano pago (preço > 0)
    if (Number(rest.Plan?.priceMonthly) <= 0) continue;

    try {
      await exports.generateSaaSInvoice(rest.id, nextMonth);
      results.generated++;
    } catch (err) {
      console.error(`Erro ao gerar fatura para ${rest.name}:`, err);
      results.errors++;
    }
  }

  return results;
};

// ============================================================
// GESTÃO DE PAGAMENTOS & LEDGER
// ============================================================

/**
 * Marca uma fatura como PAGA e lança no Livro Razão
 */
exports.markInvoiceAsPaid = async (invoiceId) => {
  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) throw new AppError('Fatura não encontrada.', 404);

  if (invoice.status === 'paid') {
    throw new AppError('Esta fatura já foi paga.', 400);
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Atualizar Fatura
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    await invoice.save({ transaction });

    // 2. Lançar no Ledger (Entrada de Caixa)
    // Crédito na conta da empresa
    await LedgerEntry.create({
      type: 'credit',
      category: invoice.type === 'saas_subscription' ? 'Receita SaaS' : 'Receita Ads',
      amount: invoice.total, // Valor cheio que entrou no banco
      description: `Pagamento Fatura #${invoice.id.split('-')[0]}`,
      invoiceId: invoice.id,
      transactionDate: new Date()
    }, { transaction });

    await transaction.commit();
    return invoice;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ============================================================
// RELATÓRIOS SIMPLES
// ============================================================

/**
 * Lista faturas com filtros
 */
exports.listInvoices = async (filters) => {
  const where = {};
  
  if (filters.status && filters.status !== 'all') where.status = filters.status;
  if (filters.restaurantId) where.restaurantId = filters.restaurantId;
  if (filters.type && filters.type !== 'all') where.type = filters.type;

  // Filtro de Data
  if (filters.startDate && filters.endDate) {
    where.createdAt = {
      [Op.between]: [
        new Date(filters.startDate + 'T00:00:00'), 
        new Date(filters.endDate + 'T23:59:59')
      ]
    };
  }

  return await Invoice.findAll({
    where,
    include: [
      { model: Restaurant, attributes: ['name'] },
      { model: Advertiser, attributes: ['companyName'] } // Agora vai funcionar pois Advertiser foi importado
    ],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Balanço Financeiro (Entradas - Saídas)
 */
exports.getLedgerBalance = async () => {
  const entries = await LedgerEntry.findAll({
    attributes: ['type', 'amount']
  });

  let totalCredit = 0;
  let totalDebit = 0;

  entries.forEach(entry => {
    if (entry.type === 'credit') totalCredit += Number(entry.amount);
    if (entry.type === 'debit') totalDebit += Number(entry.amount);
  });

  return {
    totalRevenue: totalCredit,
    totalExpenses: totalDebit,
    balance: totalCredit - totalDebit
  };
};

// ============================================================
// GESTÃO DE CAIXA (RESTAURANTE / APP CAJA)
// ============================================================

/**
 * Obtém o caixa aberto do dia para o restaurante
 */
exports.getActiveCashSession = async (restaurantId) => {
  return await CashReport.findOne({
    where: { restaurantId, status: 'open' }
  });
};

/**
 * Abre uma nova sessão de caixa
 */
exports.openCashSession = async (restaurantId, openingAmount) => {
  const active = await exports.getActiveCashSession(restaurantId);
  if (active) throw new AppError('Ya existe una sesión de caja abierta.', 400);

  return await CashReport.create({
    restaurantId,
    openingTime: new Date(),
    openingAmount: Number(openingAmount || 0),
    status: 'open'
  });
};

/**
 * Registra uma Sangria (Retirada de dinheiro do caixa)
 */
exports.addWithdrawal = async (restaurantId, amount, note = '') => {
  const active = await exports.getActiveCashSession(restaurantId);
  if (!active) throw new AppError('No hay una sesión de caja abierta.', 400);

  active.withdrawals = Number(active.withdrawals) + Number(amount);
  // Opcional: Registrar em logs de auditoria aqui
  await active.save();
  return active;
};

/**
 * Fecha a sessão de caixa (Ticket Z) e calcula totais reais
 */
exports.closeCashSession = async (restaurantId) => {
  const active = await exports.getActiveCashSession(restaurantId);
  if (!active) throw new AppError('No hay sesión de caja activa.', 400);

  // Buscar todos os pagamentos realizados enquanto o caixa estava aberto
  const payments = await SessionPayment.findAll({
    where: { cashReportId: active.id }
  });

  let totalCash = 0;
  let totalCard = 0;
  let totalPix = 0;
  let totalSales = 0;

  payments.forEach(p => {
    const val = Number(p.amount);
    totalSales += val;
    if (p.method === 'cash') totalCash += val;
    if (['card', 'debit'].includes(p.method)) totalCard += val;
    if (p.method === 'pix') totalPix += val;
  });

  active.totalCash = totalCash;
  active.totalCard = totalCard;
  active.totalSales = totalSales;
  active.closingAmount = (Number(active.openingAmount) + totalCash) - Number(active.withdrawals);
  active.closingTime = new Date();
  active.status = 'closed';

  await active.save();
  return active;
};

/**
 * Lista Histórico de Fechamentos de Caixa
 */
exports.getCashReports = async (restaurantId, filters = {}) => {
  const where = { restaurantId };
  
  if (filters.status) where.status = filters.status;
  if (filters.startDate && filters.endDate) {
    where.openingTime = { [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)] };
  }

  return await CashReport.findAll({
    where,
    order: [['openingTime', 'DESC']]
  });
};

/**
 * Detalhes de um fechamento específico
 */
exports.getCashReportById = async (restaurantId, id) => {
  const report = await CashReport.findOne({ 
    where: { id, restaurantId },
    include: [{ model: SessionPayment }] 
  });
  if (!report) throw new AppError('Relatório de caixa não encontrado.', 404);
  return report;
};
