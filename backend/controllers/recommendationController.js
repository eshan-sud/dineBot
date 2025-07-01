// backend/controllers/recommendationController.js

const pool = require("../config/db");

const getRecommendedItems = async (userId, category) => {
  try {
    // Personalized + category-filtered (if category is given)
    let personalizedQuery = `
      SELECT mi.id, mi.name, mi.price, COUNT(*) AS frequency
      FROM user_behavior ub
      JOIN menu_items mi ON ub.menu_item_id = mi.id
      WHERE ub.user_id = ? AND ub.action_type IN ('view', 'order')
    `;
    const personalizedParams = [userId];
    if (category) {
      personalizedQuery += " AND mi.name LIKE ?";
      personalizedParams.push(`%${category}%`);
    }
    personalizedQuery += `
      GROUP BY mi.id
      ORDER BY frequency DESC
      LIMIT 5
    `;
    const [personalized] = await pool.query(
      personalizedQuery,
      personalizedParams
    );
    if (personalized.length > 0) return personalized;
    // Global fallback (filtered by category if provided)
    let globalQuery = `
      SELECT mi.id, mi.name, mi.price, COUNT(*) AS frequency
      FROM user_behavior ub
      JOIN menu_items mi ON ub.menu_item_id = mi.id
      WHERE ub.action_type = 'order'
    `;
    const globalParams = [];
    if (category) {
      globalQuery += " AND mi.name LIKE ?";
      globalParams.push(`%${category}%`);
    }
    globalQuery += `
      GROUP BY mi.id
      ORDER BY frequency DESC
      LIMIT 5
    `;
    const [global] = await pool.query(globalQuery, globalParams);
    return global;
  } catch (error) {
    console.error("[getRecommendedItems Error]", error);
    return [];
  }
};

const setUserBehavior = async ({
  userId,
  menuId = null,
  menuItemId = null,
  actionType, // 'view' or 'order'
}) => {
  try {
    if (!userId || !actionType) return false;
    let restaurantId = null;
    // Get restaurantId from menuId
    if (menuId) {
      const [rows] = await pool.query(
        `SELECT restaurant_id FROM menus WHERE id = ?`,
        [menuId]
      );
      if (rows.length > 0) {
        restaurantId = rows[0].restaurant_id;
      } else {
        console.error(
          "[setUserBehavior] No restaurant found for menuId:",
          menuId
        );
      }
    }
    // Fallback get restaurantId from menuItemId
    if (!restaurantId && menuItemId) {
      const [rows] = await pool.query(
        `SELECT r.id AS restaurant_id
         FROM restaurants r
         JOIN menus m ON m.restaurant_id = r.id
         JOIN menu_items mi ON mi.menu_id = m.id
         WHERE mi.id = ?
         LIMIT 1`,
        [menuItemId]
      );
      if (rows.length > 0) {
        restaurantId = rows[0].restaurant_id;
      } else {
        console.error(
          "[setUserBehavior] No restaurant found for menuItemId:",
          menuItemId
        );
      }
    }
    await pool.query(
      `INSERT INTO user_behavior (user_id, restaurant_id, menu_item_id, action_type)
       VALUES (?, ?, ?, ?)`,
      [userId, restaurantId, menuItemId, actionType]
    );
    return true;
  } catch (error) {
    console.error("[setUserBehavior Error]", error);
    return false;
  }
};

module.exports = { getRecommendedItems, setUserBehavior };
