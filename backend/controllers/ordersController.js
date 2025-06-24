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
    console.error("Error fetching user orders:", error);
    return [];
  }
};

exports.getLatestOrder = async (userId) => {
  const [rows] = await pool.query(
    `SELECT o.status, o.total_amount, r.name
     FROM orders o
     JOIN restaurants r ON o.restaurant_id = r.id
     WHERE o.user_id = ?
     ORDER BY o.order_time DESC LIMIT 1`,
    [userId]
  );
  return rows[0];
};

exports.placeOrder = async (restaurantName, userId, items) => {
  try {
    const [restaurantRows] = await pool.query(
      "SELECT id FROM restaurants WHERE name = ?",
      [restaurantName]
    );
    if (restaurantRows.length === 0) return false;
    const restaurantId = restaurantRows[0].id;
    let totalAmount = 0;
    const itemDetails = [];
    for (const item of items) {
      const [rows] = await pool.query(
        `SELECT mi.id, mi.price FROM menu_items mi
         JOIN menus m ON mi.menu_id = m.id
         WHERE mi.name = ? AND m.restaurant_id = ?`,
        [item.name, restaurantId]
      );
      if (rows.length === 0) return false;
      const price = parseFloat(rows[0].price);
      totalAmount += price * item.quantity;
      itemDetails.push({ id: rows[0].id, quantity: item.quantity });
    }
    const [orderResult] = await pool.query(
      `INSERT INTO orders (user_id, restaurant_id, total_amount) VALUES (?, ?, ?)`,
      [userId, restaurantId, totalAmount]
    );
    const orderId = orderResult.insertId;
    for (const item of itemDetails) {
      await pool.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)`,
        [orderId, item.id, item.quantity]
      );
    }
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

exports.cancelLatestOrder = async (userId) => {
  const [res] = await pool.query(
    `UPDATE orders
     SET status = 'cancelled'
     WHERE user_id = ? AND status != 'delivered'
     ORDER BY order_time DESC LIMIT 1`,
    [userId]
  );
  return res.affectedRows > 0;
};
