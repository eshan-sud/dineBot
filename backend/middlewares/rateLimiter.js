// backend/middlewares/rateLimiter.js

const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // limit each IP to 100 requests per windowMs
  message: "⚠️ Too many requests. Try again later.",
});

module.exports = rateLimiter;
