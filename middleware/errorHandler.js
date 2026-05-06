/**
 * Global Error Handler Middleware
 * Must be registered LAST in Express (after all routes).
 * Catches any error passed via next(err).
 */
const errorHandler = (err, req, res, next) => {
  // Log full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🔥 Error:', err.stack);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    // Only expose stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
