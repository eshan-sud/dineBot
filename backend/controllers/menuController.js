// backend/controllers/menuController.js

const pool = require("../config/db");

const getMenuByRestaurantName = async (restaurantName) => {
  try {
    const [restaurants] = await pool.query(
      `SELECT id FROM restaurants WHERE name LIKE ?`,
      [`%${restaurantName}%`]
    );
    if (!restaurants.length) return null;
    const restaurantId = restaurants[0].id;
    const [[menuMeta]] = await pool.query(
      `SELECT m.id, m.name, m.description, m.image_path
       FROM menus m
       WHERE m.restaurant_id = ?
       LIMIT 1`,
      [restaurantId]
    );
    const [menuItems] = await pool.query(
      // TOFO-FUTURE : Send menu item images too
      // `SELECT
      //    mi.id,
      //    mi.name,
      //    mi.description,
      //    mi.price,
      //    IFNULL(AVG(ir.rating), 0) AS avg_rating,
      //    COUNT(ir.id) AS review_count,
      //    ii.image_url
      //  FROM menu_items mi
      //  LEFT JOIN item_reviews ir ON mi.id = ir.menu_item_id
      //  LEFT JOIN item_images ii ON mi.id = ii.menu_item_id
      //  WHERE mi.menu_id = ?
      //  GROUP BY mi.id`,
      `SELECT 
         mi.id, 
         mi.name, 
         mi.description, 
         mi.price,
         IFNULL(AVG(ir.rating), 0) AS avg_rating,
         COUNT(ir.id) AS review_count
       FROM menu_items mi
       LEFT JOIN item_reviews ir ON mi.id = ir.menu_item_id
       WHERE mi.menu_id = ?
       GROUP BY mi.id, mi.name, mi.description, mi.price`,
      [menuMeta.id]
    );
    return {
      menu: menuMeta,
      items: menuItems,
    };
  } catch (error) {
    console.error("[getMenuByRestaurantName Error]", error);
    return null;
  }
};

const getMenuItemByName = async (name, restaurantName) => {
  try {
    let sql = `
    SELECT mi.* 
    FROM menu_items mi
    JOIN menus m ON mi.menu_id = m.id
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE mi.name LIKE ?
  `;
    const params = [`%${name}%`];
    if (restaurantName) {
      sql += " AND r.name LIKE ?";
      params.push(`%${restaurantName}%`);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[getMenuItemByName Error]", error);
    return null;
  }
};

module.exports = {
  getMenuByRestaurantName,
  getMenuItemByName,
};
