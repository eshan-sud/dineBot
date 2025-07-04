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

const allowedOrigins = [
  "http://localhost:3000",
  "https://purple-hill-0150e1600.2.azurestaticapps.net", // Frontend link
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    methods: ["GET", "POST"], // Allow necessary methods, including OPTIONS for preflight
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cookie",
    ], // Ensure headers needed by the frontend are allowed
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(errorHandler);
app.use(rateLimiter);
app.use(speedLimiter);
app.use("/menu", express.static(path.join(__dirname, "public/images/"))); // Serve menu images

app.use("/api/auth", authRoutes); // User Authentication
app.use("/api/bot", botRoutes); // Bot

module.exports = app;
