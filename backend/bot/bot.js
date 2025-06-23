// backend/bot/bot.js

const { ActivityHandler } = require("botbuilder");
const cluClient = require("./cluClient");

const { getMenuByRestaurantName } = require("../controllers/menuController");
const {
  makeReservation,
  getUserReservations,
} = require("../controllers/reservationController");
const {
  getLatestOrder,
  placeOrder,
  cancelLatestOrder,
  getRecommendedItems,
} = require("../controllers/ordersController");
const { rateItem, rateRestaurant } = require("../controllers/ratingController");

function convertTo24Hour(timeStr) {
  const [time, modifier] = timeStr.toLowerCase().split(/(am|pm)/);
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "pm" && hours < 12) hours += 12;
  if (modifier === "am" && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${(minutes || 0)
    .toString()
    .padStart(2, "0")}:00`;
}

async function getIntentAndEntities(text) {
  const result = await cluClient.analyzeConversation({
    kind: "conversational",
    analysisInput: {
      conversationItem: {
        id: "1",
        text,
      },
    },
    parameters: {
      projectName: process.env.AZURE_CLU_PROJECT_NAME,
      deploymentName: process.env.AZURE_CLU_ENDPOINT_NAME,
      stringIndexType: "Utf16CodeUnit",
    },
  });
  const prediction = result.result.prediction;
  return {
    topIntent: prediction.topIntent,
    entities: prediction.entities,
  };
}

class RestaurantBot extends ActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context, next) => {
      const text = context.activity.text.toLowerCase();
      console.log("User said : ", text);
      let reply = "I'm sorry, I didn't understand that.";

      if (text.includes("cancel order")) {
        const cancelled = await cancelLatestOrder(1);
        reply = cancelled
          ? "❌ Your latest order has been cancelled."
          : "You have no order that can be cancelled.";
      } else if (text.includes("hello") || text.includes("hi")) {
        reply =
          "Hello! How can I help you with restaurant reservations or food orders today?";
      } else if (
        (text.includes("show") && text.includes("reservation")) ||
        text.includes("my reservations") ||
        text.includes("upcoming booking") ||
        text.includes("booking status")
      ) {
        const reservations = await getUserReservations(1); // assuming user_id = 1
        if (reservations.length === 0) {
          reply = "You don't have any reservations right now.";
        } else {
          reply =
            "📅 Your upcoming reservations:\n" +
            reservations
              .map(
                (r) =>
                  `• ${r.name} on ${r.reservation_date} at ${r.reservation_time} for ${r.party_size} people`
              )
              .join("\n");
        }
      } else if (text.includes("book") || text.includes("reservation")) {
        const match = text.match(
          /book.*(?:at)?\s*([a-z\s]+)\s*(?:for)?\s*(\d+)\s*(?:people|persons)?\s*(?:at)?\s*([\d:apm\s]+)?\s*(today|tomorrow)?/i
        );

        if (match) {
          const restaurantName = match[1].trim();
          const partySize = parseInt(match[2]);
          const timeText = match[3] || "7:00 PM";
          const day = match[4] || "today";

          const reservationDate = new Date();
          if (day === "tomorrow")
            reservationDate.setDate(reservationDate.getDate() + 1);
          const dateStr = reservationDate.toISOString().split("T")[0];

          const time24hr = convertTo24Hour(timeText); // Add this helper

          const success = await makeReservation(
            restaurantName,
            partySize,
            dateStr,
            time24hr
          );
          if (success) {
            reply = `✅ Your table at ${restaurantName} for ${partySize} has been booked at ${time24hr} on ${dateStr}.`;
          } else {
            reply = `❌ Could not find the restaurant "${restaurantName}". Please try again.`;
          }
        } else {
          reply =
            "Please say something like: *Book a table at Pizza Palace for 2 at 7pm tomorrow*";
        }
      } else if (text.includes("order") && text.includes("from")) {
        const match = text.match(/order (.+) from (.+)/i);

        if (match) {
          const itemsText = match[1].trim(); // "2 Margherita Pizza and 1 Garlic Bread"
          const restaurantName = match[2].trim(); // "Pizza Palace"

          // Split items by 'and'
          const itemParts = itemsText.split(" and ").map((part) => part.trim());

          // Extract quantities and item names
          const items = itemParts
            .map((part) => {
              const itemMatch = part.match(/(\d+)\s+(.+)/);
              return itemMatch
                ? {
                    name: itemMatch[2].trim(),
                    quantity: parseInt(itemMatch[1]),
                  }
                : null;
            })
            .filter(Boolean);

          const success = await placeOrder(restaurantName, 1, items); // assuming user_id = 1

          if (success) {
            reply =
              `🛒 Order placed at ${restaurantName}:\n` +
              items.map((i) => `• ${i.quantity} x ${i.name}`).join("\n");
          } else {
            reply = `❌ Could not place the order. Please check item names or restaurant.`;
          }
        } else {
          reply =
            "Please say something like: *Order 2 Margherita Pizza and 1 Garlic Bread from Pizza Palace*";
        }
      } else if (
        text.includes("order status") ||
        text.includes("track order")
      ) {
        const orders = await getLatestOrder(1); // assuming user_id = 1
        if (!orders) {
          reply = "You have no recent orders.";
        } else {
          reply = `📦 Your latest order from ${orders.name} is currently *${orders.status}*. Total: ₹${orders.total_amount}`;
        }
      } else if (text.includes("recommend") || text.includes("suggest")) {
        const recommendations = await getRecommendedItems();
        if (recommendations.length === 0) {
          reply = "No recommendations available right now.";
        } else {
          reply =
            "🔥 Recommended items for you:\n" +
            recommendations
              .map(
                (item) =>
                  `• ${item.name} - ₹${item.price} (${
                    item.rating || "No"
                  } stars)`
              )
              .join("\n");
        }
      } else if (text.includes("menu")) {
        const match = text.match(/menu (of|for)? (.+)/i);
        if (match && match[2]) {
          const restaurantName = match[2].trim();
          const menu = await getMenuByRestaurantName(restaurantName);
          if (menu && menu.length > 0) {
            reply =
              `🍽️ Menu for ${restaurantName}:\n` +
              menu
                .map(
                  (item) =>
                    `• ${item.name} - ₹${item.price}\n  ${item.description}`
                )
                .join("\n\n");
          } else {
            reply = `Sorry, I couldn't find the menu for "${restaurantName}".`;
          }
        } else {
          reply =
            "Please specify a restaurant name. For example: *menu of Pizza Palace*";
        }
      } else if (text.match(/rate (.+) (\d)/)) {
        const match = text.match(/rate (.+) (\d)/);
        const name = match[1].trim();
        const rating = parseInt(match[2]);

        let success = await rateItem(1, name, rating);
        if (!success) success = await rateRestaurant(1, name, rating);

        reply = success
          ? `⭐ Thanks! Your rating for "${name}" has been recorded.`
          : `Could not find item or restaurant named "${name}".`;
      }

      await context.sendActivity(reply);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            `Welcome to the Restaurant Bot! Here's what all I can help you with:\n\n` +
              `✅ Book a reservation\n\n` +
              `📅 Show my reservations\n\n` +
              `❌ Cancel orders\n\n` +
              `🍔 Recommend me something\n\n` +
              `🛍️ Order an item\n\n` +
              `🍕 View a menu \n\n\n` +
              `Try typing one of these to get started!`
          );
        }
      }
      await next();
    });
  }
}

module.exports.RestaurantBot = RestaurantBot;
