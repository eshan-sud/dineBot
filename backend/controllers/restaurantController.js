// backend/controllers/restaurantController.js

const pool = require("../config/db");

//  Have to work on location keyword

const getAllRestaurants = async () => {
  const [rows] = await pool.query(`
    SELECT r.id, r.name, r.price_range, r.rating,
           l.city, l.area, c.name AS cuisine
    FROM restaurants r
    JOIN locations l ON r.location_id = l.id
    JOIN cuisines c ON r.cuisine_id = c.id
  `);
  return rows;
};

const searchRestaurants = async ({
  rName,
  location,
  cuisine,
  priceRange,
  rating,
}) => {
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
};

module.exports = {
  getAllRestaurants,
  searchRestaurants,
};
