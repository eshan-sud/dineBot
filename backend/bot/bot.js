// backend/bot/bot.js

const { ActivityHandler } = require("botbuilder");
const { getMenuByRestaurantName } = require("../controllers/menuController");
// const { createReservationFromText } = require("../controllers/reservationController");

class RestaurantBot extends ActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context, next) => {
      const text = context.activity.text.toLowerCase();
      console.log("User said : ", text);
      let reply = "I'm sorry, I didn't understand that.";

      if (text.includes("hello") || text.includes("hi")) {
        reply =
          "Hello! How can I help you with restaurant reservations or food orders today?";
      } else if (text.includes("book") || text.includes("reservation")) {
        reply = await createReservationFromText(text, context);
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
      }

      await context.sendActivity(reply);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            "Welcome to the Restaurant Bot! Type something to begin."
          );
        }
      }
      await next();
    });
  }
}

module.exports.RestaurantBot = RestaurantBot;
