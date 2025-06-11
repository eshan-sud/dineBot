// backend/controllers/reservationController.js

const db = require("../config/db");
// const chrono = require("chrono-node");

const getUserReservations = async (userId) => {
  try {
    const [rows] = await db.query(
      `SELECT r.reservation_date, r.reservation_time, r.party_size, rs.name
       FROM reservations r
       JOIN restaurants rs ON r.restaurant_id = rs.id
       WHERE r.user_id = ? AND r.reservation_date >= CURDATE()
       ORDER BY r.reservation_date, r.reservation_time`,
      [userId]
    );
    return rows;
  } catch (err) {
    console.error("Get Reservations Error:", err);
    return [];
  }
};

const makeReservation = async (restaurantName, partySize, date, time) => {
  try {
    const [restaurants] = await db.query(
      "SELECT id FROM restaurants WHERE name LIKE ?",
      [`%${restaurantName}%`]
    );

    if (restaurants.length === 0) return false;

    const restaurantId = restaurants[0].id;

    // For demo purposes, assume user_id is always 1
    await db.query(
      "INSERT INTO reservations (user_id, restaurant_id, reservation_date, reservation_time, party_size) VALUES (?, ?, ?, ?, ?)",
      [1, restaurantId, date, time, partySize]
    );

    return true;
  } catch (err) {
    console.error("Reservation Error:", err);
    return false;
  }
};
module.exports = { getUserReservations, makeReservation };
