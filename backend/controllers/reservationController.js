// backend/controllers/reservationController.js

const pool = require("../config/db");
const chrono = require("chrono-node");

exports.createReservationFromText = async (text, context) => {
  try {
    const nameMatch = text.match(/at ([a-zA-Z\s]+)/);
    const sizeMatch = text.match(/for (\d+)/);
    const dateMatch = chrono.parseDate(text);

    if (!nameMatch || !sizeMatch || !dateMatch) {
      return "Please provide the restaurant name, number of people, and a time. For example: *Book a table at Pizza Palace for 2 at 7 PM tomorrow*";
    }

    const restaurantName = nameMatch[1].trim();
    const partySize = parseInt(sizeMatch[1]);
    const reservationDate = dateMatch.toISOString().split("T")[0];
    const reservationTime = dateMatch.toTimeString().split(" ")[0].slice(0, 5); // HH:MM

    const [restaurants] = await pool.query(
      "SELECT id FROM restaurants WHERE name LIKE ?",
      [`%${restaurantName}%`]
    );

    if (restaurants.length === 0) {
      return `Sorry, I couldn't find any restaurant named "${restaurantName}".`;
    }

    const restaurantId = restaurants[0].id;

    const userId = 1; // TEMP USER ID (since chatbot doesn't send user ID)

    await pool.query(
      `INSERT INTO reservations (user_id, restaurant_id, reservation_date, reservation_time, party_size) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, restaurantId, reservationDate, reservationTime, partySize]
    );

    return `✅ Reservation confirmed at ${restaurantName} for ${partySize} people on ${reservationDate} at ${reservationTime}.`;
  } catch (err) {
    console.error("Reservation Error:", err);
    return "Sorry, something went wrong while booking your reservation.";
  }
};
