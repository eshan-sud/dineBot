// backend/routes/authRoutes.js

const express = require("express");
const router = express.Router();
const {
  loginHandler,
  signupHandler,
} = require("../controllers/authController");

router.post("/login", loginHandler);
router.post("/signup", signupHandler);

module.exports = router;
