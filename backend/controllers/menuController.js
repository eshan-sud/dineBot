// backend/controllers/menuController.js

const menuModel = require("../models/menuModel");
const db = require("../config/db");

exports.getMenuByRestaurantName = async (restaurantName) => {
  const [restaurants] = await db.query(
    `SELECT id FROM restaurants WHERE name LIKE ?`,
    [`%${restaurantName}%`]
  );

  if (restaurants.length === 0) return null;

  const restaurantId = restaurants[0].id;

  const [menuItems] = await db.query(
    `SELECT mi.name, mi.description, mi.price
     FROM menu_items mi
     JOIN menus m ON mi.menu_id = m.id
     WHERE m.restaurant_id = ?`,
    [restaurantId]
  );

  return menuItems;
};

exports.getMenus = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const menus = await menuModel.getMenusByRestaurantId(restaurantId);
    res.json(menus);
  } catch (err) {
    next(err);
  }
};

exports.getMenuItems = async (req, res, next) => {
  try {
    const { menuId } = req.params;
    const items = await menuModel.getItemsByMenuId(menuId);
    res.json(items);
  } catch (err) {
    next(err);
  }
};
