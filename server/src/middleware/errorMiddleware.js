// src/middleware/errorMiddleware.js

// 1) Custom error class for API errors
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}

// 2) Wrapper for async controllers (so we don’t write try/catch everywhere)
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 3) Central error-handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;

  const payload = {
    message: err.message || "Internal server error",
  };

  if (err.details) {
    payload.details = err.details;
  }

  res.status(statusCode).json(payload);
};

module.exports = {
  ApiError,
  asyncHandler,
  errorHandler,
};
