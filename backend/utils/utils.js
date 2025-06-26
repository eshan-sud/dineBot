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

module.exports = { convertTo24Hour, displayRestaurants };
