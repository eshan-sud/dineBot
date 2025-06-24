// backend/models/authModel.js

const pool = require("../config/db");

exports.findUserByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  return rows[0];
};

exports.createUser = async (name, email, hashedPassword) => {
  const [results] = await pool.query(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, hashedPassword]
  );
  return results;
};
