/**
 * Wraps async route handlers to forward rejected promises to Express error handler.
 * Eliminates try-catch in every controller.
 */
const catchAsync = (fn) => (req, res, next) => {
    fn(req, res, next).catch(next);
};

module.exports = catchAsync;
