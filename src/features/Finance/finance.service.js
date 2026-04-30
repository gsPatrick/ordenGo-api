const { 
  Invoice, 
  LedgerEntry, 
  Restaurant, 
  Plan, 
  Region, 
  Advertiser, // <--- ADICIONADO AQUI
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
    amount: total, // Valor Final
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