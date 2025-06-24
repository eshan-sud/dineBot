// backend/controllers/ratingController.js

const pool = require("../config/db");

exports.rateItem = async (userId, itemName, rating) => {
  const [item] = await pool.query(
    `SELECT mi.id FROM menu_items mi WHERE mi.name = ? LIMIT 1`,
    [itemName]
  );
  if (!item[0]) return false;
  await pool.query(
    `INSERT INTO item_reviews (user_id, menu_item_id, rating) VALUES (?, ?, ?)`,
    [userId, item[0].id, rating]
  );
  return true;
};

exports.rateRestaurant = async (userId, name, rating) => {
  const [r] = await pool.query(
    `SELECT id FROM restaurants WHERE name = ? LIMIT 1`,
    [name]
  );
  if (!r[0]) return false;
  await pool.query(
    `INSERT INTO reviews (user_id, restaurant_id, rating) VALUES (?, ?, ?)`,
    [userId, r[0].id, rating]
  );
  return true;
};
