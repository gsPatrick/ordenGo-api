const { 
  Invoice, 
  LedgerEntry, 
  Restaurant, 
  Plan, 
  Region, 
  sequelize 
} = require('../../models');
const AppError = require('../../utils/AppError');
const { Op } = require('sequelize');

// ============================================================
// GERAÇÃO DE FATURAS (SaaS)
// ============================================================

/**
 * Gera uma fatura de assinatura SaaS para um restaurante específico.
 * Calcula impostos automaticamente baseado na Região (Fiscal Europeu).
 */
exports.generateSaaSInvoice = async (restaurantId, dueDate) => {
  // 1. Buscar dados completos
  const restaurant = await Restaurant.findByPk(restaurantId, {
    include: [
      { model: Plan },
      { model: Region } // A Região contém as regras fiscais (taxName, taxRule)
    ]
  });

  if (!restaurant) {
    throw new AppError('Restaurante não encontrado.', 404);
  }

  if (!restaurant.Plan) {
    throw new AppError('O restaurante não possui um plano ativo para gerar cobrança.', 400);
  }

  // 2. Definição de Valores Base
  const subtotal = Number(restaurant.Plan.priceMonthly);
  const currency = restaurant.currency || 'EUR';
  
  // Se o valor do plano for zero (Free Tier), não gera fatura ou gera zerada marcada como paga
  if (subtotal <= 0) {
    return null; 
  }

  // 3. Lógica Fiscal Dinâmica (Europa)
  // Padrão: Espanha Continental (IVA 21%) caso não tenha região definida
  let taxRate = 21.00; 
  let taxName = 'IVA';

  if (restaurant.Region) {
    // Se a região tem uma regra específica (ex: Canárias = 7.00), usa ela
    if (restaurant.Region.taxRule !== null && restaurant.Region.taxRule !== undefined) {
      taxRate = Number(restaurant.Region.taxRule);
    }
    // Se a região tem um nome de imposto específico (ex: "IGIC", "MwSt"), usa ele
    if (restaurant.Region.taxName) {
      taxName = restaurant.Region.taxName;
    }
  }

  // 4. Cálculo Final
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // 5. Criar Fatura (Status inicial: Sent/Enviada)
  // Em um sistema real, aqui dispararia o email via SendGrid com o PDF
  const invoice = await Invoice.create({
    type: 'saas_subscription',
    restaurantId: restaurant.id,
    amount: total, // Valor Total a Pagar
    
    // Detalhamento Fiscal para o PDF
    subtotal: subtotal,
    taxName: taxName,
    taxRate: taxRate,
    taxAmount: taxAmount,
    
    currency: currency,
    status: 'sent', 
    dueDate: dueDate || new Date()
  });

  return invoice;
};

/**
 * Rotina em Massa: Dispara a geração de faturas para TODOS os restaurantes ativos.
 * Ideal para ser chamado por um Cron Job no dia 01 de cada mês.
 */
exports.generateMonthlyInvoices = async () => {
  const activeRestaurants = await Restaurant.findAll({
    where: { isActive: true },
    include: [
      { model: Plan },
      { model: Region }
    ]
  });

  const results = { 
    totalProcessed: activeRestaurants.length,
    generated: 0, 
    skipped: 0,
    errors: 0 
  };

  // Data de vencimento padrão: Daqui a 7 dias
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);

  for (const rest of activeRestaurants) {
    try {
      // Ignora planos gratuitos
      if (!rest.Plan || Number(rest.Plan.priceMonthly) <= 0) {
        results.skipped++;
        continue;
      }

      // Verifica se já existe fatura para este mês (Evitar duplicidade)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      const existing = await Invoice.findOne({
        where: {
          restaurantId: rest.id,
          type: 'saas_subscription',
          createdAt: { [Op.gte]: startOfMonth }
        }
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      // Gera a fatura
      await exports.generateSaaSInvoice(rest.id, defaultDueDate);
      results.generated++;

    } catch (err) {
      console.error(`Erro ao gerar fatura para ${rest.name}:`, err);
      results.errors++;
    }
  }

  return results;
};

// ============================================================
// GESTÃO DE PAGAMENTOS & LEDGER (CONTABILIDADE)
// ============================================================

/**
 * Marca uma fatura como PAGA e lança o crédito no Livro Razão.
 * Usa transação para garantir integridade financeira.
 */
exports.markInvoiceAsPaid = async (invoiceId) => {
  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) {
    throw new AppError('Fatura não encontrada.', 404);
  }

  if (invoice.status === 'paid') {
    throw new AppError('Esta fatura já consta como paga.', 400);
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Atualizar Status da Fatura
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    await invoice.save({ transaction });

    // 2. Identificar Categoria para o Ledger
    let category = 'Outros';
    if (invoice.type === 'saas_subscription') category = 'Receita Recorrente (SaaS)';
    if (invoice.type === 'ad_revenue') category = 'Receita Publicidade';

    // 3. Lançar no Ledger (Entrada de Caixa / Crédito)
    await LedgerEntry.create({
      type: 'credit',
      category: category,
      amount: invoice.total, // Entra o valor cheio no caixa
      description: `Pagamento Fatura #${invoice.id.slice(0, 8)} - ${invoice.taxName} Incluído`,
      invoiceId: invoice.id,
      transactionDate: new Date()
    }, { transaction });

    // 4. (Opcional) Se quiser separar o imposto no Ledger, faria um lançamento de débito
    // ou lançaria em categorias separadas. Aqui mantemos simples: Valor total entra no caixa.

    await transaction.commit();
    return invoice;

  } catch (error) {
    await transaction.rollback();
    throw new AppError('Erro ao processar pagamento: ' + error.message, 500);
  }
};

// ============================================================
// RELATÓRIOS E CONSULTAS
// ============================================================

/**
 * Lista faturas com filtros avançados
 */
exports.listInvoices = async (filters) => {
  const where = {};
  
  if (filters.status && filters.status !== 'all') where.status = filters.status;
  if (filters.restaurantId) where.restaurantId = filters.restaurantId;
  if (filters.type && filters.type !== 'all') where.type = filters.type;

  // NOVO: Filtro de Data
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
      { model: Advertiser, attributes: ['companyName'] }
    ],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Balanço Financeiro Geral (Entradas - Saídas)
 * Lê diretamente a tabela LedgerEntry para precisão contábil.
 */
exports.getLedgerBalance = async () => {
  const entries = await LedgerEntry.findAll({
    attributes: ['type', 'amount']
  });

  let totalCredit = 0; // Entradas
  let totalDebit = 0;  // Saídas (Despesas)

  entries.forEach(entry => {
    const val = Number(entry.amount);
    if (entry.type === 'credit') totalCredit += val;
    if (entry.type === 'debit') totalDebit += val;
  });

  return {
    currency: 'EUR', // Assumindo moeda base do sistema
    totalRevenue: totalCredit.toFixed(2),
    totalExpenses: totalDebit.toFixed(2),
    balance: (totalCredit - totalDebit).toFixed(2)
  };
};