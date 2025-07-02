// backend/app.js

const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/errorHandler");
const rateLimiter = require("./middlewares/rateLimiter");
const speedLimiter = require("./middlewares/speedLimiter");

const authRoutes = require("./routes/authRoutes");
const botRoutes = require("./routes/botRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(errorHandler);
app.use(rateLimiter);
app.use(speedLimiter);
app.use("/menu", express.static(path.join(__dirname, "public/images/"))); // Serve menu images

app.use("/api/auth", authRoutes); // User Authentication
app.use("/api/bot", botRoutes); // Bot

module.exports = app;
