const { sendError } = require('../utils/response');

/**
 * Handle 404 - Not Found
 */
const notFoundHandler = (req, res, next) => {
  return sendError(res, `Route not found: ${req.originalUrl}`, 404);
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = {
  notFoundHandler,
  errorHandler
};

