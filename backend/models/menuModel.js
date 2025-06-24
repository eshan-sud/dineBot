// backend/models/menuModel.js

const pool = require("../config/db");

exports.getMenusByRestaurantId = async (restaurantId) => {
  const [rows] = await pool.query(
    `SELECT id, name, description FROM menus WHERE restaurant_id = ?`,
    [restaurantId]
  );
  return rows;
};

exports.getItemsByMenuId = async (menuId) => {
  const [rows] = await pool.query(
    `SELECT mi.id, mi.name, mi.description, mi.price, ii.image_url
     FROM menu_items mi
     LEFT JOIN item_images ii ON mi.id = ii.menu_item_id
     WHERE mi.menu_id = ?`,
    [menuId]
  );
  return rows;
};
