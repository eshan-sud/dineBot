// backend/app.js

const express = require("express");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler");
const rateLimiter = require("./middlewares/rateLimiter");
const speedLimiter = require("./middlewares/speedLimiter");

const authRoutes = require("./routes/authRoutes");
const botRoutes = require("./routes/botRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(errorHandler);
app.use(rateLimiter);
app.use(speedLimiter);

app.use("/api/auth", authRoutes); // User Authentication
app.use("/api/bot", botRoutes); // Bot

module.exports = app;
