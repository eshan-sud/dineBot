// backend/controllers/ratingController.js

const db = require("../config/db");

async function rateItem(userId, itemName, rating) {
  const [item] = await db.query(
    `SELECT mi.id FROM menu_items mi WHERE mi.name = ? LIMIT 1`,
    [itemName]
  );
  if (!item[0]) return false;
  await db.query(
    `INSERT INTO item_reviews (user_id, menu_item_id, rating) VALUES (?, ?, ?)`,
    [userId, item[0].id, rating]
  );
  return true;
}

async function rateRestaurant(userId, name, rating) {
  const [r] = await db.query(
    `SELECT id FROM restaurants WHERE name = ? LIMIT 1`,
    [name]
  );
  if (!r[0]) return false;
  await db.query(
    `INSERT INTO reviews (user_id, restaurant_id, rating) VALUES (?, ?, ?)`,
    [userId, r[0].id, rating]
  );
  return true;
}

module.exports = { rateItem, rateRestaurant };
