// backend/controllers/reservationController.js

const pool = require("../config/db");
// const chrono = require("chrono-node");

// Reservation w/ date, time, special requests

const getUserReservations = async (userEmail) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.reservation_date, r.reservation_time, r.party_size, rs.name
       FROM reservations r
       JOIN restaurants rs ON r.restaurant_id = rs.id
       JOIN users u ON r.user_id = u.id
       WHERE u.email = ? AND r.reservation_date >= CURDATE()
       ORDER BY r.reservation_date, r.reservation_time;`,
      [userEmail]
    );
    return rows;
  } catch (err) {
    console.error("Get Reservations Error:", err);
    return [];
  }
};

const makeReservation = async (
  userEmail,
  restaurantName,
  partySize,
  date,
  time
) => {
  try {
    const [users] = await pool.query("SELECT id FROM users WHERE email = ?", [
      userEmail,
    ]);
    if (users.length === 0) {
      console.error("User not found with email:", userEmail);
      return false;
    }
    const userId = users[0].id;
    const [restaurants] = await pool.query(
      "SELECT id FROM restaurants WHERE name LIKE ?",
      [`%${restaurantName}%`]
    );
    if (restaurants.length === 0) return false;
    const restaurantId = restaurants[0].id;
    await pool.query(
      "INSERT INTO reservations (user_id, restaurant_id, reservation_date, reservation_time, party_size) VALUES (?, ?, ?, ?, ?)",
      [userId, restaurantId, date, time, partySize]
    );
    return true;
  } catch (err) {
    console.error("Reservation Error:", err);
    return false;
  }
};

const cancelReservation = async (reservationId) => {
  try {
    const [result] = await pool.query("DELETE FROM reservations WHERE id = ?", [
      reservationId,
    ]);
    return result.affectedRows > 0;
  } catch (err) {
    console.error("Cancel Reservation Error:", err);
    return false;
  }
};

const modifyReservation = async (
  reservationId,
  newDate,
  newTime,
  newPartySize
) => {
  try {
    const [result] = await pool.query(
      `UPDATE reservations
       SET reservation_date = ?, reservation_time = ?, party_size = ?
       WHERE id = ?`,
      [newDate, newTime, newPartySize, reservationId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    console.error("Modify Reservation Error:", err);
    return false;
  }
};

module.exports = {
  getUserReservations,
  makeReservation,
  cancelReservation,
  modifyReservation,
};
