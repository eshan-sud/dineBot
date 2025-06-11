// backend/controllers/ordersController.js

const db = require("../config/db");

async function getLatestOrder(userId) {
  const [rows] = await db.query(
    `SELECT o.status, o.total_amount, r.name
     FROM orders o
     JOIN restaurants r ON o.restaurant_id = r.id
     WHERE o.user_id = ?
     ORDER BY o.order_time DESC LIMIT 1`,
    [userId]
  );
  return rows[0];
}

async function placeOrder(restaurantName, userId, items) {
  try {
    const [restaurantRows] = await db.query(
      "SELECT id FROM restaurants WHERE name = ?",
      [restaurantName]
    );

    if (restaurantRows.length === 0) return false;
    const restaurantId = restaurantRows[0].id;

    let totalAmount = 0;
    const itemDetails = [];

    for (const item of items) {
      const [rows] = await db.query(
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

    const [orderResult] = await db.query(
      `INSERT INTO orders (user_id, restaurant_id, total_amount) VALUES (?, ?, ?)`,
      [userId, restaurantId, totalAmount]
    );

    const orderId = orderResult.insertId;

    for (const item of itemDetails) {
      await db.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)`,
        [orderId, item.id, item.quantity]
      );
    }

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function cancelLatestOrder(userId) {
  const [res] = await db.query(
    `UPDATE orders
     SET status = 'cancelled'
     WHERE user_id = ? AND status != 'delivered'
     ORDER BY order_time DESC LIMIT 1`,
    [userId]
  );
  return res.affectedRows > 0;
}

async function getRecommendedItems() {
  const [rows] = await db.query(
    `SELECT mi.name, mi.price, AVG(ir.rating) as rating
     FROM menu_items mi
     JOIN item_reviews ir ON mi.id = ir.menu_item_id
     GROUP BY mi.id
     ORDER BY rating DESC LIMIT 5`
  );
  return rows;
}

module.exports = {
  getLatestOrder,
  placeOrder,
  cancelLatestOrder,
  getRecommendedItems,
};
