// backend/controllers/reservationController.js

const pool = require("../config/db");
// const chrono = require("chrono-node");

// Reservation w/ date, time, special requests

const getUserReservations = async (userId) => {
  try {
    const [rows] = await pool.query(
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
    const [restaurants] = await pool.query(
      "SELECT id FROM restaurants WHERE name LIKE ?",
      [`%${restaurantName}%`]
    );
    if (restaurants.length === 0) return false;
    const restaurantId = restaurants[0].id;
    // For demo purposes, assume user_id is always 1
    await pool.query(
      "INSERT INTO reservations (user_id, restaurant_id, reservation_date, reservation_time, party_size) VALUES (?, ?, ?, ?, ?)",
      [1, restaurantId, date, time, partySize]
    );

    return true;
  } catch (err) {
    console.error("Reservation Error:", err);
    return false;
  }
};

const cancelReservation = async (reservationId) => {
  const result = await pool.query("DELETE FROM reservations WHERE id = ?", [
    reservationId,
  ]);
  return result.affectedRows > 0;
};

module.exports = { getUserReservations, makeReservation, cancelReservation };
