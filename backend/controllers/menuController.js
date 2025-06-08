// backend/controllers/menuController.js

const menuModel = require("../models/menuModel");

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
