// backend/server.js

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
// const { DirectLine } = require("botframework-directlinejs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// test route
const testRoute = require("./routes/test");
app.use("/api/test", testRoute);
app.use("/api/auth", authRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
