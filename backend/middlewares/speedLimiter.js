// backend/middlewares/speedLimiter.js

const slowDown = require("express-slow-down");

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 mins
  delayAfter: 10, // allow 10 requests before slowing down
  delayMs: () => 500, // add 500ms delay per request above 10
});

module.exports = speedLimiter;
