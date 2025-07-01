// backend/controllers/authController.js

const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const findUserByEmail = async (email) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0];
  } catch (error) {
    console.error("[findUserByEmail Error]", error);
    return null;
  }
};

const loginUser = async (email, password) => {
  try {
    const user = await findUserByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );
    return { user, token };
  } catch (error) {
    console.error("[loginUser Error]", error);
    return null;
  }
};

const signupUser = async (name, email, password) => {
  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) return null;
    const hashedPassword = await bcrypt.hash(password, 10);
    const [results] = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );
    return results;
  } catch (error) {
    console.error("[signupUser Error]", error);
    return null;
  }
};

const logoutUser = async () => {
  // Remove login token from memory
};

module.exports = { loginUser, signupUser, logoutUser };
