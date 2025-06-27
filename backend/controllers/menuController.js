// backend/controllers/menuController.js

const pool = require("../config/db");

// Get menus of each restaurant w/ descriptions, pictures, & customer reviews

const getMenuByRestaurantName = async (restaurantName) => {
  const [restaurants] = await pool.query(
    `SELECT id FROM restaurants WHERE name LIKE ?`,
    [`%${restaurantName}%`]
  );
  if (!restaurants.length) return null;

  const restaurantId = restaurants[0].id;

  const [menuItems] = await pool.query(
    `SELECT mi.id, mi.name, mi.description, mi.price,
            IFNULL(AVG(ir.rating), 0) AS avg_rating,
            COUNT(ir.id) AS review_count
       FROM menu_items mi
       LEFT JOIN item_reviews ir ON mi.id = ir.menu_item_id
       JOIN menus m ON mi.menu_id = m.id
       WHERE m.restaurant_id = ?
       GROUP BY mi.id`,
    [restaurantId]
  );
  return menuItems;
};

const getMenuItems = async (req, res, next) => {
  try {
    const { menuId } = req.params;
    const [items] = await pool.query(
      `SELECT mi.id, mi.name, mi.description, mi.price,
              IFNULL(AVG(ir.rating), 0) AS avg_rating,
              COUNT(ir.id) AS review_count
       FROM menu_items mi
       LEFT JOIN item_reviews ir ON mi.id = ir.menu_item_id
       WHERE mi.menu_id = ?
       GROUP BY mi.id`,
      [menuId]
    );
    res.json(items);
  } catch (err) {
    next(err);
  }
};

const getMenuItemByName = async (name, restaurantName) => {
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
};

const filterMenuItems = async ({ vegetarian, maxPrice, minRating }) => {
  let query = `
    SELECT mi.id, mi.name, mi.description, mi.price,
           IFNULL(AVG(ir.rating), 0) AS avg_rating,
           COUNT(ir.id) AS review_count
      FROM menu_items mi
      LEFT JOIN item_reviews ir ON mi.id = ir.menu_item_id
      WHERE 1 = 1
  `;
  const params = [];
  if (vegetarian) {
    query += " AND mi.is_vegetarian = ?";
    params.push(1);
  }
  if (maxPrice) {
    query += " AND mi.price <= ?";
    params.push(maxPrice);
  }
  query += " GROUP BY mi.id";
  if (minRating) {
    query += " HAVING avg_rating >= ?";
    params.push(minRating);
  }
  const [results] = await pool.query(query, params);
  return results;
};

const getItemReviews = async (menuItemId) => {
  const [reviews] = await pool.query(
    `SELECT ir.rating, ir.comment, u.name AS user_name, ir.created_at
       FROM item_reviews ir
       JOIN users u ON ir.user_id = u.id
       WHERE menu_item_id = ?
       ORDER BY ir.created_at DESC`,
    [menuItemId]
  );
  return reviews;
};

module.exports = {
  getMenuByRestaurantName,
  getMenuItemByName,
  getMenuItems,
  filterMenuItems,
  getItemReviews,
};
