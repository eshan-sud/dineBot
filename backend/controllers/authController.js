// backend/controllers/authController.js

const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const findUserByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  return rows[0];
};

const loginUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const match = await bcrypt.compare(password, user.password);
  if (!match) return null;
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "2h",
  });
  return { user, token };
};

const signupUser = async (name, email, password) => {
  const existingUser = await findUserByEmail(email);
  if (existingUser) return null;
  const hashedPassword = await bcrypt.hash(password, 10);
  const [results] = await pool.query(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, hashedPassword]
  );
  return results;
};

const logoutUser = async () => {
  // Remove login token from memory
};

module.exports = { loginUser, signupUser, logoutUser };
