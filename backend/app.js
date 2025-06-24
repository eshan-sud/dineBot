// backend/app.js

const express = require("express");
const cors = require("cors");
// const authRoutes = require("./routes/authRoutes");
// const restaurantRoutes = require("./routes/restaurantRoutes");
// const menuRoutes = require("./routes/menuRoutes");
const botRoutes = require("./routes/botRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(errorHandler);

// app.use("/api/test", testRoute); // -- Testing --
// app.use("/api/auth", authRoutes); // User Authentication
// app.use("/api/restaurants", restaurantRoutes); // Restaurant
// app.use("/api/menu", menuRoutes); // Menu
// app.use("/api/reservations", reservationsRoutes); // Reservations
// app.use("/api/orders", ordersRoutes); // Orders
app.use("/api/bot", botRoutes); // Bot

module.exports = app;
