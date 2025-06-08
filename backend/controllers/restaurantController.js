// backend/controllers/restaurantController.js

const Restaurant = require("../models/restaurantModel");

exports.getRestaurants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.getAllRestaurants();
    res.status(200).json({ success: true, data: restaurants });
  } catch (err) {
    next(err);
  }
};

exports.searchRestaurants = async (req, res, next) => {
  try {
    const { name, location, cuisine } = req.query;
    const results = await Restaurant.searchRestaurants({
      name,
      location,
      cuisine,
    });
    res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};
