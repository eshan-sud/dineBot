// backend/models/restaurantModel.js

const pool = require("../config/db");

exports.getAllRestaurants = async () => {
  const [rows] = await pool.query(`
    SELECT r.id, r.name, r.price_range, r.rating,
           l.city, l.area, c.name AS cuisine
    FROM restaurants r
    JOIN locations l ON r.location_id = l.id
    JOIN cuisines c ON r.cuisine_id = c.id
  `);
  return rows;
};

exports.searchRestaurants = async ({ name, location, cuisine }) => {
  let sql = `
    SELECT r.id, r.name, r.price_range, r.rating, 
           l.city, l.area, c.name AS cuisine
    FROM restaurants r
    JOIN locations l ON r.location_id = l.id
    JOIN cuisines c ON r.cuisine_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (name) {
    sql += " AND r.name LIKE ?";
    params.push(`%${name}%`);
  }
  if (location) {
    sql += " AND (l.city LIKE ? OR l.area LIKE ?)";
    params.push(`%${location}%`, `%${location}%`);
  }
  if (cuisine) {
    sql += " AND c.name LIKE ?";
    params.push(`%${cuisine}%`);
  }

  const [rows] = await pool.query(sql, params);
  return rows;
};
