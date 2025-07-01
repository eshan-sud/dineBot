// backend/controllers/recommendationController.js

const pool = require("../config/db");

const getRecommendedItems = async () => {
  try {
    const [rows] = await pool.query(
      `SELECT mi.name, mi.price, AVG(ir.rating) as rating
     FROM menu_items mi
     JOIN item_reviews ir ON mi.id = ir.menu_item_id
     GROUP BY mi.id
     ORDER BY rating DESC LIMIT 5`
    );
    return rows;
  } catch (error) {
    console.error("[getRecommendedItems Error]", err);
    return null;
  }
};

module.exports = { getRecommendedItems };
