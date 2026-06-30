const env = require("../config/env");

const notFoundMiddleware = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const response = {
    success: false,
    message: err.message || "Internal server error",
  };

  if (env.nodeEnv === "development") {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  notFoundMiddleware,
  errorMiddleware,
};