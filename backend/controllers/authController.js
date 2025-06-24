// backend/controllers/authController.js

const authModel = require("../models/authModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

exports.loginUser = async (email, password) => {
  const user = await authModel.findUserByEmail(email);
  if (!user) return null;

  const match = await bcrypt.compare(password, user.password);
  if (!match) return null;

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "2h",
  });
  return { user, token };
};

exports.signupUser = async (name, email, password) => {
  const existingUser = await authModel.findUserByEmail(email);
  if (existingUser) return null;
  const hashedPassword = await bcrypt.hash(password, 10);
  return await authModel.createUser(name, email, hashedPassword);
};

exports.logoutUser = async () => {
  // Remove login token from memory
};
