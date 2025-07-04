// backend/middlewares/errorHandler.js

const errorHandler = (error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    success: false,
    message: error.message || "Server Error",
  });
};

module.exports = errorHandler;
