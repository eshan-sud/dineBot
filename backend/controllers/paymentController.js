// backend/controllers/paymentController.js

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const pool = require("../config/db");

const createPaymentIntent = async (orderId, amount) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses cents
    currency: "usd",
    metadata: { orderId },
  });
  return {
    clientSecret: paymentIntent.client_secret,
  };
};

const confirmPayment = async (paymentIntentId) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status === "succeeded") {
    return { status: "paid", id: paymentIntent.id };
  } else {
    return { status: paymentIntent.status };
  }
};

const getPaymentStatus = async (orderId) => {
  // Example: fetch from database
  const order = await pool.query(
    "SELECT payment_status FROM orders WHERE id = ?",
    [orderId]
  );
  return order.length ? { status: order[0].payment_status } : null;
};

module.exports = { createPaymentIntent, confirmPayment, getPaymentStatus };
