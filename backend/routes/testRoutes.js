// backend/routes/test.js

const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ success: true, result: rows[0].result });
  } catch (err) {
    console.error("DB test failed:", err);
    res.status(500).json({ success: false, error: "DB connection failed" });
  }
});

module.exports = router;
