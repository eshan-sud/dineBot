// backend/controllers/restaurantController.js

const pool = require("../config/db");

const getAllRestaurants = async () => {
  try {
    const [rows] = await pool.query(`
    SELECT r.id, r.name, r.price_range, r.rating,
           l.city, l.area, c.name AS cuisine
    FROM restaurants r
    JOIN locations l ON r.location_id = l.id
    JOIN cuisines c ON r.cuisine_id = c.id
  `);
    return rows;
  } catch (error) {
    console.log("[getAllRestaurants Error] ", error);
    return null;
  }
};

const searchRestaurants = async ({
  rName,
  location,
  cuisine,
  priceRange,
  rating,
}) => {
  try {
    let sql = `
    SELECT r.id, r.name, r.price_range, r.rating,
           l.city, l.area, c.name AS cuisine
    FROM restaurants r
    JOIN locations l ON r.location_id = l.id
    JOIN cuisines c ON r.cuisine_id = c.id
    WHERE 1 = 1
  `;
    const params = [];
    if (rName) {
      sql += " AND r.name LIKE ?";
      params.push(`%${rName}%`);
    }
    if (location) {
      sql += " AND (l.city LIKE ? OR l.area LIKE ?)";
      params.push(`%${location}%`, `%${location}%`);
    }
    if (cuisine) {
      sql += " AND c.name LIKE ?";
      params.push(`%${cuisine}%`);
    }
    if (priceRange) {
      sql += " AND r.price_range = ?";
      params.push(priceRange);
    }
    if (rating) {
      sql += " AND r.rating >= ?";
      params.push(rating);
    }
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error("[searchRestaurants Error]", err);
    return null;
  }
};

const getRestaurantByName = async (name) => {
  try {
    if (!name) return null;
    const sql = `
    SELECT r.id, r.name, r.price_range, r.rating,
           l.city, l.area, c.name AS cuisine
    FROM restaurants r
    JOIN locations l ON r.location_id = l.id
    JOIN cuisines c ON r.cuisine_id = c.id
    WHERE r.name LIKE ?
    LIMIT 1
  `;
    const [rows] = await pool.query(sql, [`%${name}%`]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[getRestaurantByName Error]", err);
    return null;
  }
};

module.exports = {
  getAllRestaurants,
  searchRestaurants,
  getRestaurantByName,
};
