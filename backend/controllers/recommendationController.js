// backend/controllers/recommendationController.js

const pool = require("../config/db");

exports.getRecommendedItems = async () => {
  const [rows] = await pool.query(
    `SELECT mi.name, mi.price, AVG(ir.rating) as rating
     FROM menu_items mi
     JOIN item_reviews ir ON mi.id = ir.menu_item_id
     GROUP BY mi.id
     ORDER BY rating DESC LIMIT 5`
  );
  return rows;
};
