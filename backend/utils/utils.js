// backend/utils/utils.js

const convertTo24Hour = (timeStr) => {
  const [time, modifier] = timeStr.toLowerCase().split(/(am|pm)/);
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "pm" && hours < 12) hours += 12;
  if (modifier === "am" && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${(minutes || 0)
    .toString()
    .padStart(2, "0")}:00`;
};

const displayRestaurants = (results) => {
  return (
    results
      .map(
        (r) =>
          `• ${r.name} — ${r.cuisine}, ${r.city}, ${r.area}\n\n(Rating: ${r.rating}, Price Range: ${r.price_range})`
      )
      .join("\n\n") +
    `\n\n👉 Would you like to:\n\n\n• 📋 Get menu for a specific restaurant\n\n• 🗓️ Book a table?`
  );
};

const isValidDate = (val) =>
  typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val);

const isValidTime = (val) =>
  typeof val === "string" && /^\d{2}:\d{2}$/.test(val);

const isValidEmail = (val) =>
  typeof val === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

const parseDateTime = (datetime) => {
  const parsedDate = null;
  const parsedTime = null;
  // let reservationDate = new Date();
  // if (date && date.toLowerCase().includes("tomorrow")) {
  //   reservationDate.setDate(reservationDate.getDate() + 1);
  // } else if (date && !isNaN(new Date(date).getTime())) {
  //   reservationDate = new Date(date);
  // }
  // if (time) {
  //   const match = time.match(/\d+(?::\d+)?\s*(am|pm)/i);
  //   if (match) {
  //     time24hr = convertTo24Hour(match[0]);
  //   }
  // }
  // const dateStr = reservationDate.toISOString().split("T")[0];
  return { parsedDate, parsedTime };
};

module.exports = {
  convertTo24Hour,
  displayRestaurants,
  isValidDate,
  isValidTime,
  isValidEmail,
  parseDateTime,
};
