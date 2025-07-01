// backend/bot/bot.js

const {
  ConversationState,
  MemoryStorage,
  ActivityHandler,
} = require("botbuilder");
const { getIntentAndEntities } = require("./cluClient");

const { loginUser, signupUser } = require("../controllers/authController");
const {
  getMenuByRestaurantName,
  getMenuItemByName,
} = require("../controllers/menuController");
const {
  // isRestaurantAcceptingOrders,
  ConfirmOrder,
  getUserOrders,
  getLatestOrder,
  cancelLatestOrder,
} = require("../controllers/ordersController");
const { getPaymentStatus } = require("../controllers/paymentController");
const {
  getRecommendedItems,
} = require("../controllers/recommendationController");
const {
  makeReservation,
  getUserReservations,
  cancelReservation,
  modifyReservation,
} = require("../controllers/reservationController");
const {
  getAllRestaurants,
  searchRestaurants,
  getRestaurantByName,
} = require("../controllers/restaurantController");

const {
  convertTo24Hour,
  displayRestaurants,
  isValidDate,
  isValidTime,
  isValidEmail,
} = require("../utils/utils");
const { execute } = require("../config/db");

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage); // Conversation state

class RestaurantBot extends ActivityHandler {
  sorryMessage =
    "🤔 Sorry, I didn't understand your request.\n\n" +
    "Here's what I can help you with:\n\n" +
    "• 🗓️ Book a table\n\n" +
    "• 🍔 Place an order\n\n" +
    "• 📋 View your reservations\n\n" +
    "• 💳 Make a payment\n\n" +
    "• ❓ Ask for help\n\n" +
    "👉 You can also type 'menu' or 'help' for a full list of options.";
  optionsMessage =
    "You can now try:\n\n" +
    "• 🔍 Search for a restaurant\n\n" +
    "• 🍔 Show menu\n\n" +
    "• 🛒 Order food \n\n" +
    "• 📋 Show current orders\n\n" +
    "• 📅 Reserve a table\n\n" +
    "• 📋 Show current reservations\n\n";

  constructor() {
    super();
    this.conversationState = conversationState;
    this.userProfileAccessor = conversationState.createProperty("userProfile");

    this.onMessage(async (context, next) => {
      if (!this.userProfile) {
        this.userProfile = await this.userProfileAccessor.get(context, {
          isAuthenticated: false,
          currentIntent: "Authentication",
          stateStack: { step: "choosing_auth_mode" },
          contextData: {},
          cart: [],
        });
      }
      const text = context.activity.text.trim();
      // AUTHENTICATION HANDLER
      if (!this.userProfile.isAuthenticated) {
        await this.handleAuthentication(this.userProfile, text, context);
        return;
      }

      // AUTHENTICATED USER LOGIC
      console.log(
        !this.userProfile.currentIntent
          ? `${text}`
          : `might be ${this.userProfile.currentIntent} but is ${text}`
      );
      const { topIntent, entities } = await getIntentAndEntities(
        !this.userProfile.currentIntent
          ? `${text}`
          : `might be ${this.userProfile.currentIntent} but is ${text}`
      );
      // console.log(`CLU detected intent: ${topIntent}`);
      // console.log(`CLU entities: `, entities);

      // Extract all known entities for convenience
      const entity = (name) => entities.find((e) => e.category === name)?.text;

      const contextData = {
        cuisine: entity("cuisine"),
        date: entity("date"),
        deliveryMethod: entity("deliveryMethod"),
        dietType: entity("dietType"),
        menuItem: entity("menuItem"),
        orderId: entity("orderID"),
        orderStatus: entity("orderStatus"),
        partySize: parseInt(entity("partySize")) || 2,
        priceRange: entity("priceRange"),
        quantity: parseInt(entity("quantity")),
        ratingComment: entity("ratingComment"),
        ratingValue: entity("ratingValue"),
        reservationId: entity("reservationID"),
        restaurantName: entity("restaurantName"),
        time: entity("time"),
        userId: parseInt(entity("userID")),
        userLocation: entity("userLocation"),
      };

      for (const [key, value] of Object.entries(contextData)) {
        if (value !== undefined && value !== null && value !== "") {
          if (key == "date") {
            if (isValidDate(value)) this.userProfile.contextData.date = value;
          } else if (key == "time") {
            if (isValidTime(value)) this.userProfile.contextData.time = value;
          } else {
            this.userProfile.contextData[key] = value;
          }
        }
      }
      let reply;

      // Intent Switching & State Logic
      if (this.userProfile.currentIntent === "None") {
        this.userProfile.currentIntent = null;
        this.userProfile.stateStack = null;
        this.userProfile.contextData = {};
      }
      if (
        text.toLowerCase() === "exit" ||
        text.toLowerCase() === "cancel" ||
        text.toLowerCase() === "reset"
      ) {
        this.userProfile.currentIntent = null;
        this.userProfile.stateStack = null;
        this.userProfile.contextData = {};
        reply = "✅ Conversation reset. What would you like to do?";
        await context.sendActivity(reply);
        await this.userProfileAccessor.set(context, this.userProfile);
        await this.conversationState.saveChanges(context);
        return;
      }
      console.log(topIntent);
      if (!this.userProfile.currentIntent) {
        this.userProfile.currentIntent = topIntent;
        this.userProfile.stateStack = { step: null };
      } else if (this.userProfile.currentIntent !== topIntent) {
        reply = `⚠️ You're currently doing: ${this.userProfile.currentIntent}. Say "cancel" or "reset" to start a new action.`;
        await context.sendActivity(reply);
        return;
      }

      // Proceed to intent-specific flow
      switch (this.userProfile.currentIntent) {
        // Cart ==>                                                                          [DONE]
        case "AddToCart": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to add items to your cart.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "start";
          try {
            if (step === "awaiting_quantity") {
              const match = text.match(/-?\d+/);
              const quantity = match ? parseInt(match[0]) : NaN;
              if (!quantity || quantity <= 0) {
                reply = "❓ Please enter a valid quantity (number > 0).";
                break;
              }
              this.userProfile.contextData.quantity = quantity;
              if (!this.userProfile.cart) this.userProfile.cart = [];
              this.userProfile.cart.push({
                itemId: this.userProfile.contextData.itemId,
                itemName: this.userProfile.contextData.itemName,
                quantity,
                price: this.userProfile.contextData.itemPrice,
                restaurant: this.userProfile.contextData.restaurant,
              });
              const total = this.userProfile.cart.reduce(
                (sum, i) => sum + i.price * i.quantity,
                0
              );
              this.userProfile.contextData.cartTotal = total;
              reply =
                `✅ Added **${quantity} x ${this.userProfile.contextData.itemName}** from **${this.userProfile.contextData.restaurant}** to your cart.` +
                `\n\n🧮 Total so far: ₹${total}` +
                `\n\nWhat next?\n\n• 🛍️ Add more items\n\n• 🧾 View your cart\n\n• ✅ Checkout\n\n• ❌ Remove an item`;
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
              break;
            }
            if (step === "awaiting_item") {
              const itemNameInput = text;
              if (!itemNameInput) {
                reply =
                  "❓ Please provide the name of the item you'd like to add.";
                break;
              }
              const item = await getMenuItemByName(
                itemNameInput,
                this.userProfile.contextData.restaurant
              );
              if (!item) {
                reply = `❌ Couldn't find **${itemNameInput}** at ${this.userProfile.contextData.restaurant}. Try again.`;
                break;
              }
              this.userProfile.contextData = {
                ...this.userProfile.contextData,
                itemId: item.id,
                itemName: item.name,
                itemPrice: item.price,
              };
              this.userProfile.stateStack.step = "awaiting_quantity";
              reply = `🍽️ You've selected **${item.name}**.\n\n👉 How many would you like to add?`;
              break;
            }
            if (step === "awaiting_restaurant") {
              const input = text;
              if (!input) {
                reply = "❓ Please provide the name of the restaurant.";
                break;
              }
              const found = await getRestaurantByName(input);
              if (!found) {
                reply = `❌ Couldn't find any restaurant named "${input}". Try again.`;
                break;
              }
              this.userProfile.contextData.restaurantName = found.name;
              this.userProfile.stateStack.step = "awaiting_item";
              reply = `🏪 Got it: **${found.name}**.\n\n👉 Now tell me what item you'd like to add.`;
              break;
            }
            const finalRestaurant =
              this.userProfile.contextData.restaurant ||
              contextData.restaurantName;
            const finalItemName =
              this.userProfile.contextData.itemName || contextData.menuItem;
            const quantity = parseInt(text);
            if (!finalRestaurant) {
              this.userProfile.stateStack = { step: "awaiting_restaurant" };
              reply = "🏪 Which restaurant is this item from?";
              break;
            }
            if (!finalItemName) {
              this.userProfile.contextData.restaurant = finalRestaurant;
              this.userProfile.stateStack = { step: "awaiting_item" };
              reply = "🍽️ What item would you like to add?";
              break;
            }
            const item = await getMenuItemByName(
              finalItemName,
              finalRestaurant
            );
            if (!item) {
              reply = `❌ Couldn't find **${finalItemName}** at ${finalRestaurant}. Try again.`;
              break;
            }
            this.userProfile.contextData = {
              ...this.userProfile.contextData,
              itemId: item.id,
              itemName: item.name,
              itemPrice: item.price,
              restaurant: finalRestaurant,
            };
            if (!quantity || quantity <= 0) {
              this.userProfile.stateStack = { step: "awaiting_quantity" };
              reply = `🍴 You've selected **${item.name}** from ${finalRestaurant}.\n\n👉 How many would you like to add?`;
              break;
            }
            if (!this.userProfile.cart) this.userProfile.cart = [];
            this.userProfile.cart.push({
              itemId: item.id,
              itemName: item.name,
              quantity,
              price: item.price,
              restaurant: finalRestaurant,
            });
            const total = this.userProfile.cart.reduce(
              (sum, i) => sum + i.price * i.quantity,
              0
            );
            this.userProfile.contextData.cartTotal = total;
            reply =
              `✅ Added **${quantity} x ${item.name}** from **${finalRestaurant}** to your cart.` +
              `\n\n🧮 Total so far: ₹${total}` +
              `\n\nWhat next?\n\n• 🛍️ Add more items\n\n•🧾 View your cart\n\n• ✅ Checkout\n\n• ❌ Remove an item`;
            this.userProfile.currentIntent = null;
            this.userProfile.stateStack = null;
            this.userProfile.contextData = {};
          } catch (error) {
            console.error("[AddToCart Error]", error);
            reply = "⚠️ Something went wrong. Please try again.";
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        case "RemoveFromCart": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to modify your cart.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "start";
          const cart = this.userProfile.cart || [];
          try {
            if (step === "start") {
              if (cart.length === 0) {
                reply = "🛒 Your cart is already empty.";
                this.userProfile.currentIntent = null;
                this.userProfile.stateStack = null;
                break;
              }
              let cartText = cart
                .map(
                  (item, index) =>
                    `**${index + 1}. ${item.itemName}** (Qty: ${
                      item.quantity
                    }, ₹${item.price} each)`
                )
                .join("\n");
              reply =
                `🧾 Here's your cart:\n\n${cartText}` +
                `\n\n❓ Please enter the **item number** you want to remove (eg, 2).`;

              this.userProfile.stateStack = { step: "awaiting_removal_index" };
              break;
            }
            if (step === "awaiting_removal_index") {
              const match = text.match(/-?\d+/);
              const index = match ? parseInt(match[0]) : NaN;
              if (!index || index < 1 || index > cart.length) {
                reply = `❌ Invalid number. Please enter a valid item number from your cart.`;
                break;
              }
              const removedItem = cart.splice(index - 1, 1)[0];
              const newTotal = cart.reduce(
                (sum, i) => sum + i.quantity * i.price,
                0
              );
              this.userProfile.cart = cart;
              this.userProfile.contextData.cartTotal = newTotal;
              reply =
                `✅ Removed **${removedItem.itemName}** from your cart.` +
                `\n\n🧮 Updated total: ₹${newTotal}` +
                `\n\nWhat next?\n\n• 🛍️ Add more items\n\n• 🧾 View your cart\n\n• ✅ Checkout`;
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
            }
          } catch (error) {
            console.error("[RemoveFromCart Error]", error);
            reply =
              "⚠️ Something went wrong while removing the item. Please try again.";
            this.userProfile.stateStack = { step: "start" };
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        case "ViewCart": {
          if (!this.userProfile?.userId) {
            reply = "❌ You're not logged in. Please log in to view your cart.";
            break;
          }
          try {
            const cart = this.userProfile.cart || [];
            if (cart.length === 0) {
              reply =
                "🛒 Your cart is currently empty.\n\nYou can start by adding some items!";
            } else {
              let cartText = "🧾 **Here's what's in your cart:**\n\n";
              let total = 0;
              cart.forEach((item, index) => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                cartText += `${index + 1}. **${item.itemName}** from _${
                  item.restaurant
                }_\n`;
                cartText += `   • ${item.quantity} × ₹${item.price} = ₹${itemTotal}\n\n`;
              });
              cartText += `🧮 **Total:** ₹${total}\n\n`;
              cartText +=
                "👉 What would you like to do next?\n\n• 🛍️ Add more items\n\n• ✅ Checkout\n\n• ❌ Remove an item";
              reply = cartText;
            }
          } catch (error) {
            console.error("[ClearCart Error]", error);
            reply =
              "⚠️ Something went wrong while clearing the cart. Please try again.";
            this.userProfile.stateStack = { step: "start" };
          }
          this.userProfile.currentIntent = null;
          this.userProfile.stateStack = null;
          this.userProfile.contextData = {};
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // TODO - Add extra qualifing text to this
        case "EditCart": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to modify your cart.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "start";
          const cart = this.userProfile.cart || [];
          try {
            if (step === "start") {
              if (cart.length === 0) {
                reply = "🛒 Your cart is empty.";
                this.userProfile.currentIntent = null;
                this.userProfile.stateStack = null;
                break;
              }
              const cartText = cart
                .map(
                  (item, index) =>
                    `\n\n**${index + 1}. ${item.itemName}** (Qty: ${
                      item.quantity
                    }, ₹${item.price} each)`
                )
                .join("\n");
              reply =
                `🧾 Here's your cart:\n\n${cartText}` +
                `\n\n❓ Enter the item number you'd like to edit.`;
              this.userProfile.stateStack = { step: "awaiting_item_index" };
              break;
            }
            if (step === "awaiting_item_index") {
              const match = text.match(/-?\d+/);
              const index = match ? parseInt(match[0]) : NaN;
              if (!index || index < 1 || index > cart.length) {
                reply = `❌ Invalid number. Please enter a valid item number from your cart.`;
                break;
              }
              const selectedItem = cart[index - 1];
              this.userProfile.contextData.editIndex = index - 1;
              this.userProfile.contextData.editItemName = selectedItem.itemName;
              reply = `✏️ Enter the new quantity for **${selectedItem.itemName}**:`;
              this.userProfile.stateStack = { step: "awaiting_new_quantity" };
              break;
            }
            if (step === "awaiting_new_quantity") {
              const match = text.match(/-?\d+/);
              const newQty = match ? parseInt(match[0]) : NaN;
              const idx = this.userProfile.contextData.editIndex;
              if (isNaN(newQty) || newQty < 0) {
                reply = "❌ Please enter a valid quantity (0 or more).";
                break;
              }
              let message = "";
              if (newQty === 0) {
                const removedItem = cart.splice(idx, 1)[0];
                message = `🗑️ Removed **${removedItem.itemName}** from your cart.`;
              } else {
                cart[idx].quantity = newQty;
                message = `✅ Updated quantity of **${cart[idx].itemName}** to ${newQty}.`;
              }
              const newTotal = cart.reduce(
                (sum, i) => sum + i.quantity * i.price,
                0
              );
              this.userProfile.cart = cart;
              this.userProfile.contextData.cartTotal = newTotal;
              reply =
                `${message}\n\n🧮 New total: ₹${newTotal}` +
                `\n\nWhat next?\n\n• 🛍️ Add more items\n\n• 🧾 View cart\n\n• ✅ Checkout`;
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
            }
          } catch (error) {
            console.error("[EditCart Error]", error);
            reply =
              "⚠️ Something went wrong while editing the cart. Please try again.";
            this.userProfile.stateStack = { step: "start" };
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        case "ClearCart": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to clear your cart.";
            break;
          }
          reply =
            "🧹 Your cart has been cleared.\n\nYou can start adding new items whenever you're ready.";
          this.userProfile.cart = [];
          this.userProfile.currentIntent = null;
          this.userProfile.stateStack = null;
          this.userProfile.contextData = {};
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // Extra ==> [Stateless Intents]                                                     [Done]
        case "None": {
          if (!this.userProfile.currentIntent) {
            // No intent in progress
            reply = this.sorryMessage;
          } else {
            // Intent is ongoing but unrecognized input
            reply =
              "🤔 Sorry, I didn't understand that in the context of your current request.\n\n" +
              `You're currently working on: **${this.userProfile.currentIntent}**.\n\n` +
              "• Type `cancel` to reset.\n\n" +
              "• Or continue with more details.";
          }
          this.userProfile.currentIntent = null;
          this.userProfile.stateStack = null;
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        case "GeneralGreeting": {
          reply =
            "👋 Hello! Welcome to Restaurant Bot\n\n" +
            "Here's what I can help you with:\n\n" +
            "• 🍔 Find restaurants by cuisine or location\n\n" +
            "• 📋 Show menu for a specific restaurant\n\n" +
            "• 📅 Book or cancel a reservation\n\n" +
            "• 🛍️ Place an order for pickup or delivery\n\n" +
            "• 💳 Make a payment or check its status\n\n" +
            "• 🌟 Get recommendations or review restaurants\n\n\n" +
            "👉 Just tell me what you'd like to do.";
          this.userProfile.currentIntent = null;
          this.userProfile.stateStack = null;
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // Menu ==>                                                                          [Done]
        case "ShowMenu": {
          if (!this.userProfile.contextData.restaurantName) {
            reply =
              "❓ Please specify the name of the restaurant to view its menu.";
            break;
          }
          try {
            const menu = await getMenuByRestaurantName(
              this.userProfile.contextData.restaurantName
            );
            if (!menu || menu.length === 0) {
              reply = `😔 Sorry, I couldn't find a menu for "${this.userProfile.contextData.restaurantName}". Try another restaurant?`;
            } else {
              const groupedMenu = menu.reduce((acc, item) => {
                const diet = item.dietType || "Other";
                if (!acc[diet]) acc[diet] = [];
                acc[diet].push(item);
                return acc;
              }, {});
              reply = `🍽️ Menu for **${this.userProfile.contextData.restaurantName}**:\n\n`;
              for (const [dietType, items] of Object.entries(groupedMenu)) {
                reply += `👑 ${dietType.toUpperCase()}:\n`;
                reply += items
                  .map(
                    (i) =>
                      `\n\n• ${i.name} — ₹${i.price}` +
                      (i.description ? `\n  💡 ${i.description}` : "")
                  )
                  .join("\n");
                reply += "\n\n";
              }
              reply +=
                "👉 Would you like to:\n\n• 🛍️ Add an item to your cart\n\n• 📋 View another menu\n\n• 🗓️ Reserve a table?";
            }
          } catch (error) {
            console.error("[ShowMenu Error]", error);
            reply =
              "⚠️ An error occurred while retrieving the menu. Please try again later.";
          }
          this.userProfile.currentIntent = null;
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // Order ==>
        case "CheckOrderStatus": {
          console.log("CheckOrderStatus");
          // try {
          //   if (!this.userProfile?.userId) {
          //     reply =
          //       "❌ You're not logged in. Please log in to check your order status.";
          //     break;
          //   }
          //   if (!orderId) {
          //     const userOrders = await getUserOrders(this.userProfile.userId);
          //     if (!userOrders || userOrders.length === 0) {
          //       reply = "ℹ️ You have no recent or active orders.";
          //     } else if (userOrders.length === 1) {
          //       const order = userOrders[0];
          //       reply = `📦 Your only order (#${order.id}) is currently ${
          //         order.status || "unknown status"
          //       }.`;
          //     } else {
          //       reply =
          //         "📋 Here are your recent or active orders:\n\n" +
          //         userOrders
          //           .map(
          //             (o) =>
          //               `• Order #${o.id} — Status: ${
          //                 o.status || "unknown status"
          //               } — Total: ₹${o.total_amount}`
          //           )
          //           .join("\n") +
          //         `\n\n👉 Please provide the Order ID you want to check the status for.`;
          //       this.userProfile.stateStack.step = "choosing_order_for_status"; // Await next reply
          //     }
          //   } else {
          //     const order = await getOrderById(orderId, this.userProfile.userId);
          //     if (!order) {
          //       reply = `❓ No order found for Order ID ${orderId}. Please verify and try again.`;
          //     } else {
          //       const status = order.status || "unknown status";
          //       reply = `📦 Order ${orderId} is currently ${status}.`;
          //     }
          //   }
          // } catch (error) {
          //   console.error("[CheckOrderStatus Error]", error);
          //   reply =
          //     "⚠️ An error occurred while trying to fetch your order status. Please try again later.";
          // }
          // break;
          break;
        }

        case "CancelOrder": {
          // Also clears Cart too
          console.log("CancelOrder");
          // try {
          //   if (!this.userProfile?.userId) {
          //     reply =
          //       "❌ You're not logged in. Please log in to manage your orders.";
          //     break;
          //   }
          //   const orders = await getUserOrders(this.userProfile.userId);
          //   if (!orders || orders.length === 0) {
          //     reply =
          //       "🤔 You don't have any active or recent orders to cancel.";
          //     break;
          //   }
          //   if (orders.length === 1) {
          //     const order = orders[0];
          //     reply = `📋 You have an active order:\n\n• Order #${order.id} — Status: ${order.status}\n\nWould you like to cancel this order?\n\n✅ Type "yes" to cancel\n❌ Type "no" to keep it.`;
          //     this.userProfile.currentOrderId = order.id;
          //     this.userProfile.stateStack.step = "confirm_single_order_cancellation"; // Await user confirmation
          //   } else {
          //     reply =
          //       "📋 You have multiple active orders. Here are your options:\n\n" +
          //       orders
          //         .map((o) => `• Order #${o.id} — Status: ${o.status}`)
          //         .join("\n") +
          //       '\n\n👉 Type the Order ID you want to cancel, or type "all" to cancel all active orders.';
          //     this.userProfile.stateStack.step = "choosing_order_for_cancellation"; // Await next reply
          //   }
          // } catch (error) {
          //   console.error("[CancelOrder Error]", error);
          //   reply =
          //     "⚠️ An error occurred while trying to cancel your order. Please try again later.";
          //   this.userProfile.stateStack.step = "idle"; // Reset state in case of error
          // }
          // break;
          break;
        }

        // Payment ==>
        case "CheckPaymentStatus": {
          console.log("CheckPaymentStatus");
          // switch (this.userProfile.paymentCheckState) {
          //   case undefined: {
          //     if (!orderId) {
          //       reply = "❓ Please provide the Order ID you'd like to check.";
          //     } else {
          //       const payment = await getPaymentStatus(
          //         orderId,
          //         this.userProfile.userId
          //       );
          //       if (!payment) {
          //         reply = `❓ No payment information found for order ${orderId}.`;
          //       } else {
          //         switch (payment.status) {
          //           case "paid":
          //             reply = `✅ Payment for order ${orderId} has been successfully completed.\n\n👉 What would you like to do next?\n• 🗓️ Book a table\n• 🍔 Place a new order\n• 📋 View my orders\n• ❓ Ask for help`;
          //             break;
          //           case "pending":
          //             reply = `⏳ Payment for order ${orderId} is still *pending*. Would you like to:\n\n• 💳 Try paying again?\n• ❌ Cancel this order?\n\nPlease type "pay" to try again or "cancel" to cancel the order.`;
          //             this.userProfile.paymentCheckState = "pending_payment_action";
          //             this.userProfile.currentOrderId = orderId;
          //             break;
          //           case "failed":
          //             reply = `⚠️ Payment for order ${orderId} has *failed*.\n\n👉 Would you like to try paying again, or cancel the order?\n• Type "pay" to try again\n• Type "cancel" to cancel the order.`;
          //             this.userProfile.paymentCheckState = "pending_payment_action";
          //             this.userProfile.currentOrderId = orderId;
          //             break;
          //           default:
          //             reply = `ℹ️ The payment status for order ${orderId} is *${payment.status}*.\n\n👉 Let me know if you'd like help with next steps!`;
          //             break;
          //         }
          //       }
          //     }
          //     break;
          //   }
          //   case "pending_payment_action": {
          //     if (text && text.toLowerCase() === "pay") {
          //       reply = `💳 Let's try making the payment again for order ${this.userProfile.currentOrderId}. Please type "make payment" to proceed.`;
          //     } else if (text && text.toLowerCase() === "cancel") {
          //       reply = `❌ You've chosen to cancel order ${this.userProfile.currentOrderId}. Type "cancel order" to confirm.`;
          //     } else {
          //       reply = `❓ Please respond with "pay" or "cancel" for order ${this.userProfile.currentOrderId}.`;
          //     }
          //     // Reset state if user chooses one of the valid options
          //     if (text && ["pay", "cancel"].includes(text.toLowerCase())) {
          //       delete this.userProfile.paymentCheckState;
          //       delete this.userProfile.currentOrderId;
          //     }
          //     break;
          //   }
          //   default: {
          //     reply =
          //       "🤔 An error occurred while trying to check the payment status. Let's start over.";
          //     delete this.userProfile.paymentCheckState;
          //     delete this.userProfile.currentOrderId;
          //     break;
          //   }
          // }
          // break;
          break;
        }

        case "PayOrder": {
          console.log("PayOrder");
          break;
        }

        // Recommendation ==>
        case "RecommendItem": {
          console.log("RecommendItem");
          // try {
          //   if (!this.userProfile?.userId) {
          //     reply =
          //       "❌ You're not logged in. Please log in to get recommendations.";
          //     break;
          //   }
          //   if (!dietType && !this.userProfile.recommendationCategoryRequested) {
          //     reply =
          //       "🍳 What category or type of item would you like recommendations for? (e.g., pizza, pasta, drinks)";
          //     this.userProfile.recommendationCategoryRequested = true;
          //     break;
          //   } else {
          //     const categoryToUse =
          //       category || this.userProfile.lastRequestedCategory;
          //     const recommendations = await getRecommendedItems(categoryToUse);
          //     if (!recommendations || recommendations.length === 0) {
          //       reply = categoryToUse
          //         ? `☹️ No recommendations available for "${categoryToUse}" right now. Would you like recommendations for another category?`
          //         : "☹️ No recommendations available right now.";
          //       delete this.userProfile.recommendationCategoryRequested;
          //       delete this.userProfile.lastRequestedCategory;
          //       break;
          //     }
          //     reply =
          //       `🔥 Here are some recommendations for ${
          //         categoryToUse || "you"
          //       }:\n` +
          //       recommendations
          //         .map((item) => `• ${item.name} - ₹${item.price}`)
          //         .join("\n") +
          //       `\n\n👉 Would you like to:\n` +
          //       "• 🛍️ Order one of these?\n" +
          //       "• 👀 See recommendations for another category?\n" +
          //       "• ❓ Ask for help?";
          //     this.userProfile.lastRequestedCategory = categoryToUse;
          //     delete this.userProfile.recommendationCategoryRequested;
          //   }
          // } catch (error) {
          //   console.error("[RecommendItem Error]", error);
          //   reply =
          //     "⚠️ An error occurred while fetching recommendations. Please try again later.";
          //   delete this.userProfile.recommendationCategoryRequested;
          //   delete this.userProfile.lastRequestedCategory;
          // }
          // break;
          break;
        }

        // Reservations ==>                                                                  [DONE]
        // TODO - Check for past date & time also
        case "MakeReservation": {
          if (!this.userProfile?.userId) {
            reply = "❌ You're not logged in. Please log in to book a table.";
            break;
          }
          const contextData = this.userProfile.contextData || {};
          const step =
            this.userProfile.stateStack?.step || "awaiting_restaurant";
          if (contextData.restaurantName && !contextData.restaurant) {
            contextData.restaurant = contextData.restaurantName.trim();
          }
          if (
            contextData.partySize &&
            typeof contextData.partySize === "string"
          ) {
            contextData.partySize = parseInt(contextData.partySize);
          }
          try {
            if (step === "awaiting_restaurant") {
              if (!contextData.restaurant || !contextData.restaurant.trim()) {
                this.userProfile.stateStack = { step: "awaiting_restaurant" };
                reply =
                  "❓ Please provide the name of the restaurant you'd like to book.";
                break;
              }
              this.userProfile.stateStack = { step: "awaiting_date" };
              reply = `📍 You've selected **${contextData.restaurant}**.\n\n📅 Please provide the reservation date (YYYY-MM-DD):`;
              break;
            }
            if (step === "awaiting_date") {
              if (
                !contextData.date ||
                isNaN(new Date(contextData.date).getTime())
              ) {
                this.userProfile.stateStack = { step: "awaiting_date" };
                reply =
                  "❓ Please provide a valid date in the format YYYY-MM-DD.";
                break;
              }
              this.userProfile.stateStack = { step: "awaiting_time" };
              reply =
                "⏰ Thanks! Now, what time would you like to book (e.g., 18:30)?";
              break;
            }
            if (step === "awaiting_time") {
              if (
                !contextData.time ||
                !/^\d{2}:\d{2}$/.test(contextData.time)
              ) {
                this.userProfile.stateStack = { step: "awaiting_time" };
                reply = "❓ Please provide a valid time in HH:MM (24h) format.";
                break;
              }
              this.userProfile.stateStack = { step: "awaiting_party_size" };
              reply = "👥 Thanks! Now, how many people will be in your party?";
              break;
            }
            if (step === "awaiting_party_size") {
              const partySize = parseInt(contextData.partySize);
              if (!partySize || partySize <= 0) {
                this.userProfile.stateStack = { step: "awaiting_party_size" };
                reply = "❓ Please provide a valid number for the party size.";
                break;
              }
              this.userProfile.stateStack = { step: "confirming_booking" };
              reply = `✅ ${contextData.restaurant} has availability on ${contextData.date} at ${contextData.time} for ${partySize} people.\n\n👉 Type "confirm table" to book or "cancel table" to abort.`;
              break;
            }
            if (step === "confirming_booking") {
              if (
                (text || "").toLowerCase().includes("confirm") &&
                (text || "").toLowerCase().includes("table")
              ) {
                const { restaurant, partySize, date, time } = contextData;
                const success = await makeReservation(
                  this.userProfile.email,
                  restaurant,
                  partySize,
                  date,
                  time
                );
                if (success) {
                  reply = `✅ Your table at **${restaurant}** for ${partySize} has been booked on ${date} at ${time}!\n\n👉 What would you like to do next?\n\n• 🍔 Place an order\n\n• 📋 View my reservations\n\n• ❓ Ask for help`;
                } else {
                  reply = `❌ Could not complete the booking. It might no longer be available. Try a different time or restaurant.`;
                }
              } else {
                reply = `❌ Booking cancelled.\n\n👉 What would you like to do next?\n\n• 🗓️ Book another table\n\n• 📋 View my reservations\n\n• ❓ Ask for help`;
              }
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
              break;
            }
          } catch (error) {
            console.error("[MakeReservation Error]", error);
            reply =
              "⚠️ An error occurred while processing your reservation. Please try again later.";
            this.userProfile.currentIntent = null;
            this.userProfile.stateStack = null;
            this.userProfile.contextData = {};
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        case "CancelReservation": {
          if (!this.userProfile?.userId) {
            reply = "❌ You're not logged in. Please log in to book a table.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "initial";
          try {
            if (step === "initial") {
              const userEmail = this.userProfile.email;
              const userReservations = await getUserReservations(userEmail);
              if (!userReservations || userReservations.length === 0) {
                reply = "ℹ️ You have no active reservations to cancel.";
                this.userProfile.currentIntent = null;
                this.userProfile.stateStack = null;
                this.userProfile.contextData = {};
                break;
              } else if (userReservations.length === 1) {
                const res = userReservations[0];
                const cancelled = await cancelReservation(res.id);
                reply = cancelled
                  ? `❌ Your reservation (ID: ${res.id}) has been cancelled.
\n\n👉 What would you like to do next?\n\n• 🗓️ Book a table\n\n• 🍔 Place an order\n\n• 📋 View my reservations\n\n• ❓ Ask for help`
                  : `⚠️ Could not cancel reservation ${res.id}. It might already be cancelled.\n\n👉 What would you like to do next?\n\n• 🗓️ Book a table\n\n• 🍔 Place an order\n\n• 📋 View my reservations\n\n• ❓ Ask for help`;
                this.userProfile.currentIntent = null;
                this.userProfile.stateStack = null;
                this.userProfile.contextData = {};
                break;
              }
              this.userProfile.contextData.userReservations = userReservations;
              this.userProfile.stateStack = { step: "awaiting_reservation_id" };
              reply =
                "📋 You have multiple active reservations:\n\n" +
                userReservations
                  .map(
                    (r) =>
                      `\n\n• ID ${r.id}: ${r.restaurant_name} on ${r.reservation_date} at ${r.reservation_time}`
                  )
                  .join("\n") +
                `\n\n👉 Please provide the Reservation ID you want to cancel.`;
              break;
            }
            if (step === "awaiting_reservation_id") {
              const idMatch = text.match(/\d+/);
              const chosenId = idMatch ? parseInt(idMatch[0]) : null;
              if (!chosenId) {
                reply = "❓ Please enter a valid Reservation ID to cancel.";
                break;
              }
              const validIds = (
                this.userProfile.contextData.userReservations || []
              ).map((r) => r.id);
              if (!validIds.includes(chosenId)) {
                reply = `❌ Reservation ID ${chosenId} not found in your upcoming reservations. Please try again.`;
                break;
              }
              const cancelled = await cancelReservation(chosenId);
              reply = cancelled
                ? `❌ Your reservation (ID: ${chosenId}) has been cancelled.\n\n👉 What would you like to do next?\n\n• 🗓️ Book a table\n\n• 🍔 Place an order\n\n• 📋 View my reservations\n\n• ❓ Ask for help`
                : `⚠️ Could not cancel reservation ${chosenId}. It might already be cancelled or not exist.\n\n👉 What would you like to do next?\n\n• 🗓️ Book a table\n\n• 🍔 Place an order\n\n• 📋 View my reservations\n\n• ❓ Ask for help`;
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
              break;
            }
          } catch (error) {
            console.error("[CancelReservation Error]", error);
            reply =
              "⚠️ An error occurred while trying to cancel your reservation. Please try again later.";
            this.userProfile.currentIntent = null;
            this.userProfile.stateStack = null;
            this.userProfile.contextData = {};
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // TODO - Add extra qualifing text to this
        case "ModifyReservation": {
          if (!this.userProfile?.userId) {
            reply = "❌ You're not logged in. Please log in to book a table.";
            break;
          }
          const contextData = this.userProfile.contextData || {};
          const step = this.userProfile.stateStack?.step || "initial";
          try {
            const userEmail = this.userProfile.email;
            if (step === "initial") {
              const userReservations = await getUserReservations(userEmail);
              if (!userReservations || userReservations.length === 0) {
                reply = "ℹ️ You have no active reservations to modify.";
                this.userProfile.currentIntent = null;
                this.userProfile.stateStack = null;
                this.userProfile.contextData = {};
                break;
              }
              this.userProfile.contextData.userReservations = userReservations;
              this.userProfile.stateStack = { step: "awaiting_reservation_id" };
              reply =
                "📋 You have the following reservations:" +
                userReservations
                  .map(
                    (r) =>
                      `\n\n• ID ${r.id}: ${r.restaurant_name} on ${r.reservation_date} at ${r.reservation_time}`
                  )
                  .join("\n") +
                `\n\n👉 Please provide the Reservation ID you want to modify.`;
              break;
            }
            if (step === "awaiting_reservation_id") {
              const idMatch = text.match(/\d+/);
              const chosenId = idMatch ? parseInt(idMatch[0]) : null;
              if (!chosenId) {
                reply = "❓ Please enter a valid Reservation ID to modify.";
                break;
              }
              const validIds = (
                this.userProfile.contextData.userReservations || []
              ).map((r) => r.id);
              if (!validIds.includes(chosenId)) {
                reply = `❌ Reservation ID ${chosenId} not found in your upcoming reservations. Please try again.`;
                break;
              }
              contextData.reservationId = chosenId;
              this.userProfile.stateStack.step = "awaiting_new_date";
              reply = `✏️ You're modifying reservation ${chosenId}.\n\n📅 Please enter the new reservation date (YYYY-MM-DD):`;
              break;
            }
            if (step === "awaiting_new_date") {
              if (!text || isNaN(new Date(text).getTime())) {
                reply =
                  "❓ Please provide a valid date in the format YYYY-MM-DD.";
                break;
              }
              contextData.newDate = text;
              this.userProfile.stateStack.step = "awaiting_new_time";
              reply = "⏰ Thanks! Now, what is the new time (e.g., 18:30)?";
              break;
            }
            if (step === "awaiting_new_time") {
              if (!text || !/^\d{2}:\d{2}$/.test(text.trim())) {
                reply = "❓ Please provide a valid time in HH:MM (24h) format.";
                break;
              }
              contextData.newTime = text.trim();
              this.userProfile.stateStack.step = "awaiting_new_party_size";
              reply = "👥 Great! How many people will be in your party?";
              break;
            }
            if (step === "awaiting_new_party_size") {
              const partySize = parseInt(text);
              if (!partySize || partySize <= 0) {
                reply = "❓ Please provide a valid number for the party size.";
                break;
              }
              contextData.newPartySize = partySize;
              this.userProfile.stateStack.step = "confirming_modification";
              reply = `✅ You're about to modify reservation ${contextData.reservationId}:\n\n📅 Date: ${contextData.newDate}\n\n⏰ Time: ${contextData.newTime}\n\n👥 Party Size: ${partySize}\n\n👉 Reply "confirm modification" to confirm or "cancel" to abort.`;
              break;
            }
            if (step === "confirming_modification") {
              if (
                text.toLowerCase().includes("confirm") ||
                text.toLowerCase().includes("modification")
              ) {
                const { reservationId, newDate, newTime, newPartySize } =
                  contextData;
                const success = await modifyReservation(
                  reservationId,
                  newDate,
                  newTime,
                  newPartySize
                );
                reply = success
                  ? `✅ Reservation ${reservationId} has been successfully modified!`
                  : `❌ Could not modify reservation ${reservationId}. It might no longer be valid.`;
              } else {
                reply = "❌ Reservation modification cancelled.";
              }
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
              break;
            }
          } catch (error) {
            console.error("[ModifyReservation Error]", error);
            reply =
              "⚠️ An error occurred while trying to modify your reservation. Please try again later.";
            this.userProfile.currentIntent = null;
            this.userProfile.stateStack = null;
            this.userProfile.contextData = {};
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        case "ShowReservations": {
          if (!this.userProfile?.userId) {
            reply = "❌ You're not logged in. Please log in to book a table.";
            break;
          }
          try {
            const reservations = await getUserReservations(
              this.userProfile.email
            );
            if (!reservations || reservations.length === 0) {
              reply = "ℹ️ You don't have any upcoming reservations.";
            } else {
              reply = "📅 Here are your upcoming reservations:\n\n";
              reply += reservations
                .map(
                  (res) =>
                    `\n\n• ID ${res.id}: **${res.name}** on ${res.reservation_date} at ${res.reservation_time} for ${res.party_size} people`
                )
                .join("\n");
              reply +=
                "\n\n👉 What would you like to do?\n\n• ❌ Cancel a reservation\n\n• ✏️ Modify a reservation\n\n• 📋 View menu or book another table";
            }
          } catch (error) {
            console.error("[ShowReservations Error]", error);
            reply =
              "⚠️ An error occurred while retrieving your reservations. Please try again later.";
          }
          this.userProfile.currentIntent = null;
          this.userProfile.stateStack = null;
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // Restaurant ==>                                                                    [DONE]
        case "SearchRestaurant": {
          try {
            // Check for keyword: "all restaurants"
            if (/all\s+restaurants/i.test(text)) {
              const results = await getAllRestaurants();
              if (results && results.length > 0) {
                reply = `🏁 Here are all available restaurants:\n\n${displayRestaurants(
                  results
                )}`;
                this.userProfile.contextData.lastSearchResults = results;
              } else {
                reply = "🤔 No restaurants found.";
              }
              break;
            }
            // Not enough info to search
            const noSearchParams =
              !this.userProfile.contextData.restaurantName &&
              !this.userProfile.contextData.cuisine &&
              !this.userProfile.contextData.userLocation &&
              !this.userProfile.contextData.currentLocation &&
              !this.userProfile.contextData.priceRange &&
              !this.userProfile.contextData.ratingValue;
            if (noSearchParams) {
              reply =
                "❓ Please specify one or more of:\n• Restaurant name\n• Cuisine\n• Location\n• Price range\n• Minimum rating";
              break;
            }
            // Clean up overlapping terms
            let location =
              this.userProfile.contextData.userLocation ||
              this.userProfile.contextData.currentLocation ||
              null;
            if (
              this.userProfile.contextData.cuisine &&
              this.userProfile.contextData.location &&
              this.userProfile.contextData.location
                .toLowerCase()
                .includes(this.userProfile.contextData.cuisine.toLowerCase())
            ) {
              this.userProfile.contextData.location = null;
            }
            if (
              this.userProfile.contextData.restaurantName &&
              this.userProfile.contextData.location &&
              this.userProfile.contextData.location.toLowerCase() ===
                this.userProfile.contextData.restaurantName.toLowerCase()
            ) {
              location = null;
            }
            const results = await searchRestaurants({
              restaurantName: this.userProfile.contextData.restaurantName,
              location: this.userProfile.contextData.location,
              cuisine: this.userProfile.contextData.cuisine,
              priceRange: this.userProfile.contextData.priceRange,
              rating: this.userProfile.contextData.ratingValue,
            });
            if (results && results.length > 0) {
              reply =
                `🔍 Found the following restaurants` +
                `${
                  this.userProfile.contextData.restaurantName
                    ? ` for "${this.userProfile.contextData.restaurantName}"`
                    : ""
                }` +
                `${
                  this.userProfile.contextData.cuisine
                    ? ` with ${this.userProfile.contextData.cuisine} cuisine`
                    : ""
                }` +
                `${
                  this.userProfile.contextData.location
                    ? ` in ${this.userProfile.contextData.location}`
                    : ""
                }` +
                `${
                  this.userProfile.contextData.priceRange
                    ? ` priced ${this.userProfile.contextData.priceRange}`
                    : ""
                }` +
                `${
                  this.userProfile.contextData.ratingValue
                    ? ` rated ${this.userProfile.contextData.ratingValue}+`
                    : ""
                }` +
                `:\n\n${displayRestaurants(results)}`;

              this.userProfile.contextData.lastSearchResults = results;
            } else {
              reply =
                `🤔 No results found` +
                `${
                  this.userProfile.contextData.restaurantName
                    ? ` for "${this.userProfile.contextData.restaurantName}"`
                    : ""
                }` +
                `${
                  this.userProfile.contextData.cuisine
                    ? ` with ${this.userProfile.contextData.cuisine} cuisine`
                    : ""
                }` +
                `${
                  this.userProfile.contextData.location
                    ? ` in ${this.userProfile.contextData.location}`
                    : ""
                }` +
                `${
                  this.userProfile.contextData.priceRange
                    ? ` priced ${this.userProfile.contextData.priceRange}`
                    : ""
                }` +
                `${
                  this.userProfile.contextData.ratingValue
                    ? ` rated ${this.userProfile.contextData.ratingValue}+`
                    : ""
                }` +
                `. Try another query.`;
            }
          } catch (error) {
            console.error("[SearchRestaurant Error]", error);
            reply =
              "⚠️ An error occurred while searching for restaurants. Please try again later.";
          }
          break;
        }

        default: {
          // This handles unexpected or undefined intents
          if (this.userProfile.currentState) {
            reply =
              "🤔 It seems I didn't understand your request for this step.\n" +
              "If you're trying to continue an ongoing action, you can:\n" +
              "✅ Try retyping your input.\n" +
              "↩️ Type 'cancel' to abort the current action.\n" +
              "❓ Or ask for help.";
          } else {
            reply = this.sorryMessage;
          }
          break;
        }
      }
      await context.sendActivity(reply);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          const userProfile = await this.userProfileAccessor.get(context, {
            isAuthenticated: false,
            currentIntent: "Authentication",
            stateStack: { step: "choosing_auth_mode" },
            contextData: {},
            cart: [],
          });
          this.userProfile = userProfile;
          await this.userProfileAccessor.set(context, userProfile);
          await this.conversationState.saveChanges(context);
          await context.sendActivity(
            '👋 Welcome to the Restaurant Bot 👋\n\nPlease type:\n\n👉 "login" to sign in\n\n👉 "signup" to register\n'
          );
        }
      }
      await next();
    });
  }

  async handleAuthentication(userProfile, text, context) {
    if (!this.userProfile.currentIntent) {
      this.userProfile.currentIntent = "Authentication";
      this.userProfile.stateStack = { step: "choosing_auth_mode" };
      this.userProfile.contextData = {};
      await context.sendActivity(
        `👋 Welcome! Would you like to "login" or "signup"?`
      );
      return;
    }
    const step = this.userProfile.stateStack.step;
    const lcText = text.toLowerCase();
    switch (step) {
      case "choosing_auth_mode": {
        if (lcText === "login") {
          this.userProfile.stateStack.step = "login_email";
          await context.sendActivity("📧 Please enter your email:");
        } else if (lcText === "signup") {
          this.userProfile.stateStack.step = "signup_name";
          await context.sendActivity("📝 Please enter your name:");
        } else {
          await context.sendActivity(`❓ Please type "login" or "signup".`);
        }
        break;
      }
      case "login_email": {
        if (isValidEmail(lcText)) this.userProfile.email = lcText;
        this.userProfile.stateStack.step = "login_password";
        await context.sendActivity("🔐 Please enter your password:");
        break;
      }
      case "login_password": {
        const email = this.userProfile.email;
        const password = text;
        const authResult = await loginUser(email, password);
        if (authResult) {
          Object.assign(this.userProfile, {
            isAuthenticated: true,
            userId: authResult.user.id,
            token: authResult.token,
            currentIntent: null,
            stateStack: null,
            contextData: {},
          });
          await context.sendActivity(
            `✅ Welcome, ${email}! You're now logged in.`
          );
          await context.sendActivity(this.optionsMessage);
        } else {
          this.userProfile.stateStack.step = "choosing_auth_mode";
          await context.sendActivity(
            `❌ Invalid email or password. Try "login" or "signup".`
          );
        }
        break;
      }
      case "signup_name": {
        this.userProfile.name = lcText;
        this.userProfile.stateStack.step = "signup_email";
        await context.sendActivity("📧 Please enter your email:");
        break;
      }
      case "signup_email": {
        this.userProfile.email = lcText;
        this.userProfile.stateStack.step = "signup_password";
        await context.sendActivity("🔐 Please enter your password:");
        break;
      }
      case "signup_password": {
        const { name, email } = this.userProfile;
        const password = text;
        const result = await signupUser(name, email, password);
        if (result) {
          Object.assign(this.userProfile, {
            isAuthenticated: true,
            userId: result.id,
            currentIntent: null,
            stateStack: null,
            contextData: {},
          });
          await context.sendActivity(
            `✅ Welcome ${name}! You're now registered and logged in.\n\n`
          );
          await context.sendActivity(this.optionsMessage);
        } else {
          this.userProfile.stateStack.step = "choosing_auth_mode";
          await context.sendActivity(
            `❌ Registration failed. Please try again.`
          );
        }
        break;
      }
      default: {
        this.userProfile.stateStack.step = "choosing_auth_mode";
        await context.sendActivity(
          `❓ Let's start over. Would you like to login or signup?`
        );
        break;
      }
    }
    await this.userProfileAccessor.set(context, userProfile);
    await this.conversationState.saveChanges(context);
  }
}

module.exports.RestaurantBot = RestaurantBot;
