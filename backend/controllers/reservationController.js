// backend/controllers/reservationController.js

const pool = require("../config/db");

const getUserReservations = async (userId) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.reservation_date, r.reservation_time, r.party_size, rs.name
       FROM reservations r
       JOIN restaurants rs ON r.restaurant_id = rs.id
       WHERE r.user_id = ? AND r.reservation_date >= CURDATE()
       ORDER BY r.reservation_date, r.reservation_time;`,
      [userId]
    );
    return rows;
  } catch (err) {
    console.error("[getUserReservations Error]", err);
    return [];
  }
};

const makeReservation = async (
  userId,
  restaurantName,
  partySize,
  date,
  time,
  notes = null
) => {
  try {
    const [restaurants] = await pool.query(
      "SELECT id FROM restaurants WHERE name LIKE ?",
      [`%${restaurantName}%`]
    );
    if (restaurants.length === 0) return false;
    const restaurantId = restaurants[0].id;
    await pool.query(
      "INSERT INTO reservations (user_id, restaurant_id, reservation_date, reservation_time, party_size, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, restaurantId, date, time, partySize, notes]
    );
    return true;
  } catch (err) {
    console.error("[makeReservation Error]", err);
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
    console.error("[cancelReservation Error]", err);
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
    console.error("[modifyReservation Error]", err);
    return false;
  }
};

module.exports = {
  getUserReservations,
  makeReservation,
  cancelReservation,
  modifyReservation,
};
