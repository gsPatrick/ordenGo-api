const feedbackService = require('./feedback.service');
const catchAsync = require('../../utils/catchAsync');

exports.create = catchAsync(async (req, res, next) => {
  // req.restaurantId injetado (seja por token de usuario ou logica de tablet)
  const review = await feedbackService.createReview(req.restaurantId || req.body.restaurantId, req.body);

  // Opcional: Emitir socket para o Dashboard do Gerente em tempo real
  // req.io.to(`manager_${req.restaurantId}`).emit('new_review', review);

  res.status(201).json({
    status: 'success',
    data: { review }
  });
});

exports.getSummary = catchAsync(async (req, res, next) => {
  const stats = await feedbackService.getFeedbackSummary(req.restaurantId);

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

exports.list = catchAsync(async (req, res, next) => {
  const reviews = await feedbackService.getReviewsList(req.restaurantId);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews }
  });
});