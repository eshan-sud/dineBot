// backend/controllers/authController.js

const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

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
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    return { user, token, refreshToken };
  } catch (error) {
    console.error("[loginUser Error]", error);
    return null;
  }
};

const signupUser = async (name, email, password) => {
  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) return null;
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt); // Hashing + Salting
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

const loginHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    const auth = await loginUser(email, password);
    if (!auth) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return res.status(200).json({
      userId: auth.user.id,
      token: auth.token,
      refreshToken: auth.refreshToken,
    });
  } catch (error) {
    console.log("[loginHandler Error]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const signupHandler = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await signupUser(name, email, password);
    if (!result) {
      return res.status(400).json({ message: "Signup failed" });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(500).json({ message: "User not found after signup" });
    }
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    return res.status(201).json({ userId: user.id, token, refreshToken });
  } catch (error) {
    console.log("[signupHandler Error]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const refreshTokenHandler = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ message: "Refresh token missing" });
  try {
    const userData = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = generateAccessToken(userData);
    return res.status(200).json({ token: newAccessToken, refreshToken });
  } catch (error) {
    console.error("[refreshTokenHandler Error]", error);
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "Token required" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("[authenticateToken Error]", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = {
  loginUser,
  signupUser,
  loginHandler,
  signupHandler,
  refreshTokenHandler,
  authenticateToken,
};
