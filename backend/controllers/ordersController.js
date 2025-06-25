// backend/controllers/ordersController.js

const pool = require("../config/db");

exports.getUserOrders = async (userId) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.status, o.order_time, o.total_amount, r.name AS restaurant_name
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = ? AND o.status NOT IN ('delivered', 'cancelled')
       ORDER BY o.order_time DESC`,
      [userId]
    );
    return orders;
  } catch (error) {
    console.error("[getUserOrders Error]", error);
    return [];
  }
};

exports.getLatestOrder = async (userId) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.status, o.total_amount, r.name
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = ?
       ORDER BY o.order_time DESC LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("[getLatestOrder Error]", error);
    return null;
  }
};

exports.isRestaurantAcceptingOrders = async (restaurantName) => {
  try {
    const [rows] = await pool.query(
      `SELECT accepting_orders FROM restaurants WHERE name = ?`,
      [restaurantName]
    );
    return rows.length && rows[0].accepting_orders === 1;
  } catch (error) {
    console.error("[isRestaurantAcceptingOrders Error]", error);
    return false;
  }
};

exports.ConfirmOrder = async (restaurantName, userId, items) => {
  try {
    // Find the restaurant
    const [restaurantRows] = await pool.query(
      "SELECT id FROM restaurants WHERE name = ?",
      [restaurantName]
    );
    if (!restaurantRows.length) {
      console.error("[ConfirmOrder] Restaurant not found:", restaurantName);
      return null;
    }
    const restaurantId = restaurantRows[0].id;
    // Calculate total amount
    let totalAmount = 0;
    const itemDetails = [];
    for (const item of items) {
      const [rows] = await pool.query(
        `SELECT mi.id, mi.price
           FROM menu_items mi
           JOIN menus m ON mi.menu_id = m.id
           WHERE mi.name = ? AND m.restaurant_id = ?`,
        [item.name, restaurantId]
      );
      if (!rows.length) {
        console.error(`[ConfirmOrder] Item not found: ${item.name}`);
        return null;
      }
      const price = parseFloat(rows[0].price);
      totalAmount += price * item.quantity;
      itemDetails.push({ id: rows[0].id, quantity: item.quantity });
    }
    // Create order
    const [orderResult] = await pool.query(
      `INSERT INTO orders (user_id, restaurant_id, total_amount, status) VALUES (?, ?, ?, 'placed')`,
      [userId, restaurantId, totalAmount]
    );
    const orderId = orderResult.insertId;
    // Create order_items
    for (const item of itemDetails) {
      await pool.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)`,
        [orderId, item.id, item.quantity]
      );
    }
    return orderId;
  } catch (error) {
    console.error("[ConfirmOrder Error]", error);
    return null;
  }
};

exports.cancelLatestOrder = async (userId) => {
  try {
    const [res] = await pool.query(
      `UPDATE orders
       SET status = 'cancelled'
       WHERE user_id = ? AND status NOT IN ('delivered', 'cancelled')
       ORDER BY order_time DESC
       LIMIT 1`,
      [userId]
    );
    return res.affectedRows > 0;
  } catch (error) {
    console.error("[cancelLatestOrder Error]", error);
    return false;
  }
};
