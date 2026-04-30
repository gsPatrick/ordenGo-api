const financeService = require('./finance.service');
const catchAsync = require('../../utils/catchAsync');

// --- Invoices ---

exports.listInvoices = catchAsync(async (req, res, next) => {
  const filters = {
    status: req.query.status,
    restaurantId: req.query.restaurantId,
    type: req.query.type,
    startDate: req.query.startDate, // <--- NOVO
    endDate: req.query.endDate      // <--- NOVO
  };
  const invoices = await financeService.listInvoices(filters);
  
  res.status(200).json({
    status: 'success',
    results: invoices.length,
    data: { invoices }
  });
});

exports.triggerMonthlyGeneration = catchAsync(async (req, res, next) => {
  // Endpoint para ser chamado por Cron Job ou Botão manual
  const summary = await financeService.generateMonthlyInvoices();
  
  res.status(200).json({
    status: 'success',
    message: 'Processo de geração em massa concluído.',
    data: summary
  });
});

exports.markAsPaid = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const invoice = await financeService.markInvoiceAsPaid(id);

  res.status(200).json({
    status: 'success',
    message: 'Fatura baixada com sucesso. Lançamento criado no Ledger.',
    data: { invoice }
  });
});

// --- Ledger / Visão Geral ---

exports.getBalance = catchAsync(async (req, res, next) => {
  const balance = await financeService.getLedgerBalance();
  
  res.status(200).json({
    status: 'success',
    data: balance
  });
});