// backend/controllers/paymentController.js

const pool = require("../config/db");

const createPaymentOrder = async (orderId, amount) => {
  try {
    const payment_status = "paid";
    const method = "mock";
    await pool.query(
      "INSERT INTO payments (order_id, payment_status, amount, method) VALUES (?, ?, ?, ?)",
      [orderId, payment_status, amount, method]
    );
    return true;
  } catch (err) {
    console.error("[createPaymentOrder Error]", err);
    return false;
  }
};

const checkPaymentStatus = async (orderId, userId) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.payment_status
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE o.id = ? AND o.user_id = ?
       LIMIT 1`,
      [orderId, userId]
    );
    return rows[0];
  } catch (error) {
    console.error("[checkPaymentStatus Error]", error);
    return null;
  }
};

const refundPayment = async (orderId) => {
  try {
    const [res] = await pool.query(
      `UPDATE payments
       SET status = 'refunded'
       WHERE order_id = ? AND status = 'paid'`,
      [orderId]
    );
    return res.affectedRows > 0;
  } catch (error) {
    console.error("[refundPayment Error]", error);
    return false;
  }
};

module.exports = { createPaymentOrder, checkPaymentStatus, refundPayment };
