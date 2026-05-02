const financeService = require('./finance.service');
const catchAsync = require('../../utils/catchAsync');

// --- Invoices ---

exports.listInvoices = catchAsync(async (req, res, next) => {
  const filters = {
    status: req.query.status,
    restaurantId: req.query.restaurantId,
    type: req.query.type,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };
  const invoices = await financeService.listInvoices(filters);
  
  res.status(200).json({
    status: 'success',
    results: invoices.length,
    data: { invoices }
  });
});

exports.triggerMonthlyGeneration = catchAsync(async (req, res, next) => {
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

// --- CAJA (OPERACIONAL) ---

exports.getActiveSession = catchAsync(async (req, res, next) => {
  const session = await financeService.getActiveCashSession(req.restaurantId);
  res.status(200).json({ status: 'success', data: { session } });
});

exports.openSession = catchAsync(async (req, res, next) => {
  const { openingAmount } = req.body;
  const session = await financeService.openCashSession(req.restaurantId, openingAmount);
  res.status(201).json({ status: 'success', data: { session } });
});

exports.addWithdrawal = catchAsync(async (req, res, next) => {
  const { amount, note } = req.body;
  const session = await financeService.addWithdrawal(req.restaurantId, amount, note);
  res.status(200).json({ status: 'success', data: { session } });
});

exports.closeSession = catchAsync(async (req, res, next) => {
  const session = await financeService.closeCashSession(req.restaurantId);
  res.status(200).json({ status: 'success', data: { session } });
});

exports.listCashReports = catchAsync(async (req, res, next) => {
  const reports = await financeService.getCashReports(req.restaurantId, req.query);
  res.status(200).json({ status: 'success', results: reports.length, data: { reports } });
});

exports.getCashReportDetails = catchAsync(async (req, res, next) => {
  const report = await financeService.getCashReportById(req.restaurantId, req.params.id);
  res.status(200).json({ status: 'success', data: { report } });
});