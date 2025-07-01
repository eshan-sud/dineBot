// backend/controllers/ordersController.js

const pool = require("../config/db");

const createOrder = async (userId, cartItems) => {
  try {
    if (!cartItems || cartItems.length === 0) return null;
    const restaurantName = cartItems[0].restaurantName;
    const [restaurantRows] = await pool.query(
      "SELECT id FROM restaurants WHERE name = ?",
      [restaurantName]
    );
    if (!restaurantRows.length) {
      console.error("[CreateOrder] Restaurant not found:", restaurantName);
      return null;
    }
    const restaurantId = restaurantRows[0].id;
    let totalAmount = 0;
    const itemDetails = [];
    for (const item of cartItems) {
      const [rows] = await pool.query(
        `SELECT mi.id, mi.price
         FROM menu_items mi
         JOIN menus m ON mi.menu_id = m.id
         WHERE mi.name = ? AND m.restaurant_id = ?`,
        [item.itemName, restaurantId]
      );
      if (!rows.length) {
        console.error(`[CreateOrder] Item not found: ${item.itemName}`);
        return null;
      }
      const price = parseFloat(rows[0].price);
      totalAmount += price * item.quantity;
      itemDetails.push({ id: rows[0].id, quantity: item.quantity });
    }
    // Insert order
    const [orderResult] = await pool.query(
      `INSERT INTO orders (user_id, restaurant_id, total_amount, order_status)
       VALUES (?, ?, ?, 'placed')`,
      [userId, restaurantId, totalAmount]
    );
    const orderId = orderResult.insertId;
    // Insert order_items
    for (const item of itemDetails) {
      await pool.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity)
         VALUES (?, ?, ?)`,
        [orderId, item.id, item.quantity]
      );
    }
    return {
      id: orderId,
      total_amount: totalAmount,
    };
  } catch (error) {
    console.error("[createOrder Error]", error);
    return null;
  }
};

const getUserOrders = async (userId) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.order_status, o.order_time, o.total_amount, r.name AS restaurant_name
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = ? AND o.order_status NOT IN ('delivered', 'cancelled')
       ORDER BY o.order_time DESC`,
      [userId]
    );
    return orders;
  } catch (error) {
    console.error("[getUserOrders Error]", error);
    return [];
  }
};

const cancelOrder = async (orderId) => {
  try {
    const [res] = await pool.query(
      `UPDATE orders
       SET order_status = 'cancelled'
       WHERE id = ?`,
      [orderId]
    );
    return res.affectedRows > 0;
  } catch (error) {
    console.error("[cancelOrder Error]", error);
    return false;
  }
};

const getLatestOrder = async (userId) => {
  try {
    const [rows] = await pool.query(
      `SELECT id
       FROM orders
       WHERE user_id = ?
       ORDER BY order_time DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0];
  } catch (error) {
    console.error("[getLatestOrder Error]", error);
    return null;
  }
};

const getUserActiveOrders = async (userId) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.order_status AS status, o.order_time, o.total_amount, r.name AS restaurant_name
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = ? AND o.order_status NOT IN ('delivered', 'cancelled')
       ORDER BY o.order_time DESC`,
      [userId]
    );
    return orders;
  } catch (error) {
    console.error("[getUserActiveOrders Error]", error);
    return [];
  }
};

module.exports = {
  getUserOrders,
  createOrder,
  cancelOrder,
  getLatestOrder,
  getUserActiveOrders,
};
