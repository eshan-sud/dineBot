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
    });
  } catch (error) {
    console.error("Login error:", error);
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
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    return res.status(201).json({ userId: user.id, token });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "Token required" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("[authenticateToken Error]", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = {
  loginUser,
  signupUser,
  loginHandler,
  signupHandler,
  authenticateToken,
};
