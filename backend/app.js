// backend/app.js

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
// const menuRoutes = require("./routes/menuRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

// test route
const testRoute = require("./routes/test");
app.use(errorHandler);

app.use("/api/test", testRoute); // -- Testting --
app.use("/api/auth", authRoutes); // User Authentication
app.use("/api/restaurants", restaurantRoutes); // Restaurant
// app.use("/api/menu", menuRoutes); // Menu

module.exports = app;
