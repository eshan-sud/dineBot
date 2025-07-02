// backend/utility/utils.js

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

const isValidDate = (val) => {
  if (typeof val !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const now = new Date();
  const date = new Date(val + "T00:00:00");
  return date.setHours(23, 59, 59) > now.getTime();
};
const isValidTime = (val) => {
  if (
    typeof timeStr !== "string" ||
    !/^\d{2}:\d{2}$/.test(timeStr) ||
    typeof dateStr !== "string"
  )
    return false;
  const combined = new Date(`${dateStr}T${timeStr}`);
  const now = new Date();
  return !isNaN(combined.getTime()) && combined > now;
};

const isValidEmail = (val) =>
  typeof val === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

module.exports = {
  displayRestaurants,
  isValidDate,
  isValidTime,
  isValidEmail,
};
