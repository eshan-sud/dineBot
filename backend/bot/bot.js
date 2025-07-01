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
  getUserOrders,
  createOrder,
  cancelOrder,
  getLatestOrder,
  getUserActiveOrders,
} = require("../controllers/ordersController");
const {
  createPaymentOrder,
  checkPaymentStatus,
  refundPayment,
} = require("../controllers/paymentController");
const {
  getRecommendedItems,
  setUserBehavior,
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
  displayRestaurants,
  isValidDate,
  isValidTime,
  isValidEmail,
} = require("../utils/utils");
const { execute } = require("../config/db");

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage); // Conversation state

class RestaurantBot extends ActivityHandler {
  optionsMessage =
    "• 🔍 Search for a restaurant based on cuisine, name, or location\n\n• 🍔 Show menu\n\n• 🛍️ Place food order for delivery or takeaway\n\n• 🛒 Show or edit cart\n\n• 📅 Book or cancel reservations\n\n• 📋 Show current reservations\n\n• 💳 Make a payment or check its status\n\n• 🌟 Get recommendations for ordering";
  sorryMessage =
    "🤔 Sorry, I didn't understand your request.\n\nHere's what I can help you with:\n\n" +
    this.optionsMessage;

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
      const text = context.activity.text.toLowerCase().trim();
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
      if (text === "exit" || text === "cancel" || text === "reset") {
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
          const step = this.userProfile.stateStack?.step || "initial";
          try {
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
              this.userProfile.contextData.restaurantId = found.name;
              this.userProfile.stateStack.step = "awaiting_item";
              reply = `🏪 Got it: **${found.name}**.\n\n👉 Now tell me what item you'd like to add.`;
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
                this.userProfile.contextData.restaurantName
              );
              if (!item) {
                reply = `❌ Couldn't find **${itemNameInput}** at ${this.userProfile.contextData.restaurantName}. Try again.`;
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
                restaurantName: this.userProfile.contextData.restaurantName,
                restaurantId: this.userProfile.contextData.restaurantId,
              });
              const total = this.userProfile.cart.reduce(
                (sum, i) => sum + i.price * i.quantity,
                0
              );
              this.userProfile.contextData.cartTotal = total;
              reply =
                `✅ Added **${quantity} x ${this.userProfile.contextData.itemName}** from **${this.userProfile.contextData.restaurantName}** to your cart.` +
                `\n\n🧮 Total so far: ₹${total}` +
                `\n\nWhat next?\n\n• 🛍️ Add more items\n\n• 🧾 View your cart\n\n• ✅ Checkout\n\n• ❌ Remove an item`;
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
              break;
            }
            const finalRestaurant = this.userProfile.contextData.restaurantName;
            const finalItemName =
              this.userProfile.contextData.itemName || contextData.menuItem;
            const quantity = parseInt(text);
            if (!finalRestaurant) {
              this.userProfile.stateStack = { step: "awaiting_restaurant" };
              reply = "🏪 Which restaurant is this item from?";
              break;
            }
            if (!finalItemName) {
              this.userProfile.contextData.restaurantName = finalRestaurant;
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
              restaurantName: finalRestaurant,
            };
            if (!quantity || quantity <= 0) {
              this.userProfile.stateStack = { step: "awaiting_quantity" };
              reply = `🍴 You've selected **${item.name}** from **${finalRestaurant}**.\n\n👉 How many would you like to add?`;
              break;
            }
            if (!this.userProfile.cart) this.userProfile.cart = [];
            this.userProfile.cart.push({
              itemId: item.id,
              itemName: item.name,
              quantity,
              price: item.price,
              restaurantName: finalRestaurant,
              restaurantId: this.userProfile.contextData.restaurantId,
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
            reply =
              "⚠️ An error occurred while adding the item to cart. Please try again later.";
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        case "RemoveFromCart": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to remove items from your cart.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "initial";
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
              "⚠️ An error occurred while removing the item from your cart. Please try again later.";
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
                  item.restaurantName
                }_\n`;
                cartText += `   • ${item.quantity} × ₹${item.price} = ₹${itemTotal}\n\n`;
              });
              cartText += `🧮 **Total:** ₹${total}\n\n👉 What would you like to do next?\n\n• 🛍️ Add more items\n\n• ✅ Pay for cart\n\n• ❌ Remove an item`;
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

        case "EditCart": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to modify your cart.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "initial";
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
              "⚠️ An error occurred while editing the cart. Please try again later.";
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
            reply = `🤔 Sorry, I didn't understand that in the context of your current request.\n\nYou're currently working on: **${this.userProfile.currentIntent}**.\n\n• Type \"cancel\" to reset.\n\n• Or continue with more details.`;
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
            this.optionsMessage;
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
              for (const item of menu) {
                await setUserBehavior({
                  userId: this.userProfile.userId,
                  menuItemId: item.id,
                  actionType: "view",
                });
              }
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
          this.userProfile.stateStack = null;
          this.userProfile.contextData = {};
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // Order ==>
        case "CheckOrderStatus": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to check your order status.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "initial";
          const contextData = this.userProfile.contextData || {};
          try {
            if (step === "initial") {
              const userOrders = await getUserOrders(this.userProfile.userId);
              if (!userOrders || userOrders.length === 0) {
                reply = "ℹ️ You have no recent or active orders.";
                break;
              } else if (userOrders.length === 1) {
                const order = userOrders[0];
                reply = `📦 Your order (#${order.id}) is currently *${order.order_status}*.\n\n🧾 Total: ₹${order.total_amount}`;
                break;
              } else {
                contextData.orders = userOrders;
                this.userProfile.contextData = contextData;
                this.userProfile.stateStack = {
                  step: "awaiting_order_id_for_status",
                };
                reply =
                  "📋 Here are your recent or active orders:\n\n" +
                  userOrders
                    .map(
                      (o) =>
                        `• Order #${o.id} — Status: ${o.status} — Total: ₹${o.total_amount}`
                    )
                    .join("\n") +
                  `\n\n👉 Please provide the Order ID you want to check the status for.`;
                break;
              }
            }
            if (step === "awaiting_order_id_for_status") {
              const orderIdMatch = text.match(/\d+/);
              const orderId = orderIdMatch ? parseInt(orderIdMatch[0]) : null;
              if (!orderId) {
                reply = "❓ Please provide a valid numeric Order ID.";
                break;
              }
              const order = await getOrderById(
                orderId,
                this.userProfile.userId
              );
              if (!order) {
                reply = `❌ No active order found with ID ${orderId}. Please check again.`;
              } else {
                reply = `📦 Order #${order.id} is currently *${order.order_status}*.\n\n🧾 Total: ₹${order.total_amount}`;
              }
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
              break;
            }
          } catch (error) {
            console.error("[CheckOrderStatus Error]", error);
            reply =
              "⚠️ An error occurred while trying to fetch your order status. Please try again later.";
            this.userProfile.currentIntent = null;
            this.userProfile.stateStack = null;
            this.userProfile.contextData = {};
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        case "CancelOrder": {
          // Also clears Cart too
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to cancel your order.";
            break;
          }
          try {
            const step = this.userProfile.stateStack?.step || "initial";
            if (step === "initial") {
              const orders = await getUserActiveOrders(this.userProfile.userId); // Only non-cancelled
              if (!orders || orders.length === 0) {
                reply =
                  "🤔 You don't have any active or recent orders to cancel.";
                break;
              }
              if (orders.length === 1) {
                const order = orders[0];
                this.userProfile.stateStack = {
                  step: "confirm_single_order_cancellation",
                };
                this.userProfile.currentOrderId = order.id;
                reply = `📋 You have an active order:\n\n• Order #${order.id} — Status: ${order.status}\n\n👉 Would you like to cancel this order?\n\n✅ Type "yes" to cancel\n\n❌ Type "no" to keep it.`;
              } else {
                this.userProfile.contextData = { activeOrders: orders };
                this.userProfile.stateStack = {
                  step: "choosing_order_for_cancellation",
                };
                reply =
                  "📋 You have multiple active orders:\n\n" +
                  orders
                    .map((o) => `\n• Order #${o.id} — Status: ${o.status}`)
                    .join("\n") +
                  '\n\n👉 Type the Order ID you want to cancel, or type "all" to cancel all active orders.';
              }
              break;
            }
            if (step === "choosing_order_for_cancellation") {
              const orderIdMatch = text.match(/\d+/);
              const orderId = orderIdMatch ? parseInt(orderIdMatch[0]) : null;
              if (text.toLowerCase().includes("all")) {
                this.userProfile.stateStack = { step: "confirm_cancel_all" };
                reply =
                  '⚠️ Are you sure you want to cancel *all* your active orders?\n\n✅ Type "yes" to proceed or "no" to abort.';
                break;
              }
              const validIds = (
                this.userProfile.contextData.activeOrders || []
              ).map((o) => o.id);
              if (!validIds.includes(orderId)) {
                reply = `❌ Order ID ${orderId} not found in your active orders. Try again.`;
                break;
              }
              this.userProfile.currentOrderId = orderId;
              this.userProfile.stateStack = {
                step: "confirm_single_order_cancellation",
              };
              reply = `❓ Confirm cancelling order #${orderId}? Type "yes" to cancel or "no" to abort.`;
              break;
            }
            if (step === "confirm_single_order_cancellation") {
              if (text.includes("yes")) {
                const orderId = this.userProfile.currentOrderId;
                const paid = await checkPaymentStatus(
                  orderId,
                  this.userProfile.userId
                );
                await cancelOrder(orderId);
                if (paid?.status === "paid") {
                  await refundPayment(orderId);
                  reply = `✅ Order #${orderId} has been cancelled and your payment will be refunded.`;
                } else {
                  reply = `✅ Order #${orderId} has been successfully cancelled.`;
                }
                this.userProfile.cart = []; // Clear cart
              } else {
                reply = "❌ Cancellation aborted.";
              }
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
              delete this.userProfile.currentOrderId;
              break;
            }
            if (step === "confirm_cancel_all") {
              if (text.includes("yes")) {
                const activeOrders =
                  this.userProfile.contextData.activeOrders || [];
                for (const order of activeOrders) {
                  const paid = await checkPaymentStatus(
                    order.id,
                    this.userProfile.userId
                  );
                  await cancelOrder(order.id);
                  if (paid?.status === "paid") {
                    await refundPayment(order.id);
                  }
                }
                reply = `✅ All active orders have been cancelled and any completed payments will be refunded.`;
                this.userProfile.cart = []; // Clear cart
              } else {
                reply = "❌ Order cancellation aborted.";
              }
              this.userProfile.currentIntent = null;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
              break;
            }
          } catch (error) {
            console.error("[CancelOrder Error]", error);
            reply =
              "⚠️ An error occurred while processing your cancellation. Please try again.";
            this.userProfile.stateStack = null;
            this.userProfile.contextData = {};
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // Payment ==>                                                                       [DONE]
        case "CheckPaymentStatus": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to check payment status.";
            break;
          }
          try {
            const step = this.userProfile.stateStack?.step || "initial";
            if (step === "initial") {
              const latestOrder = await getLatestOrder(this.userProfile.userId);
              if (!latestOrder) {
                reply =
                  "ℹ️ You don't have any recent orders to check payment for.";
                break;
              }
              const orderId = latestOrder.id;
              const payment = await checkPaymentStatus(
                orderId,
                this.userProfile.userId
              );
              if (!payment) {
                reply = `❓ No payment information found for your latest order (ID: ${orderId}).`;
                break;
              }
              switch (payment.status) {
                case "paid":
                  reply = `✅ Payment for order ${orderId} has been successfully completed.`;
                  break;
                case "pending":
                  reply =
                    `⏳ Payment for order ${orderId} is still *pending*.\nWould you like to:\n\n` +
                    `• 💳 Try paying again?\n• ❌ Cancel this order?\n\n` +
                    `Please type "yes" to try again or "no" to cancel the order.`;
                  this.userProfile.stateStack = {
                    step: "pending_payment_action",
                  };
                  this.userProfile.currentOrderId = orderId;
                  break;
                case "failed":
                  reply =
                    `⚠️ Payment for order ${orderId} has *failed*.\n\nWould you like to:\n` +
                    `• 💳 Try paying again?\n• ❌ Cancel this order?\n\n` +
                    `Please type "yes" to retry or "no" to cancel the order.`;
                  this.userProfile.stateStack = {
                    step: "pending_payment_action",
                  };
                  this.userProfile.currentOrderId = orderId;
                  break;
                default:
                  reply = `ℹ️ The payment status for order ${orderId} is *${payment.payment_status}*. Let me know if you need help.`;
                  break;
              }
              break;
            }
            if (step === "pending_payment_action") {
              if (text.includes("yes")) {
                reply = `💳 Let's retry the payment for Order ${this.userProfile.currentOrderId}. Please type "make payment" to continue.`;
              } else if (text.includes("no")) {
                reply = `❌ You've chosen to cancel order ${this.userProfile.currentOrderId}. Type "cancel order" to confirm.`;
              } else {
                reply = `❓ Please respond with "yes" or "no" for order ${this.userProfile.currentOrderId}.`;
                break;
              }
              this.userProfile.stateStack = null;
              this.userProfile.currentOrderId = null;
              break;
            }
            reply =
              "🤔 An error occurred while checking payment status. Let's start over.";
            this.userProfile.stateStack = null;
            this.userProfile.currentOrderId = null;
          } catch (error) {
            console.error("[CheckPaymentStatus Error]", error);
            reply =
              "⚠️ An error occurred while checking the payment status of your latest order. Please try again later.";
            this.userProfile.stateStack = null;
            this.userProfile.currentOrderId = null;
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        case "PayOrder": {
          if (!this.userProfile?.userId) {
            reply = "❌ You're not logged in. Please log in to place an order.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "initial";
          const contextData = this.userProfile.contextData || {};
          try {
            if (step === "initial") {
              if (
                !this.userProfile.cart ||
                this.userProfile.cart.length === 0
              ) {
                reply =
                  "🛒 Your cart is empty. Add items to your cart before proceeding to payment.";
                break;
              }
              const cartItems = this.userProfile.cart
                .map(
                  (item, idx) =>
                    `\n\n${idx + 1}. ${item.quantity} x ${item.itemName} (₹${
                      item.price
                    }) from ${item.restaurantName}`
                )
                .join("\n");
              const totalAmount = this.userProfile.cart.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );
              contextData.totalAmount = totalAmount;
              this.userProfile.contextData = contextData;
              this.userProfile.stateStack = {
                step: "awaiting_delivery_method",
              };
              reply = `🧾 Your cart:\n${cartItems}\n\n💰 Total: ₹${totalAmount}\n\n👉 Would you prefer **delivery** or **takeaway**?`;
              break;
            }
            if (step === "awaiting_delivery_method") {
              if (text.includes("delivery") || text.includes("takeaway")) {
                contextData.deliveryMethod = text.includes("delivery")
                  ? "delivery"
                  : "takeaway";
                this.userProfile.contextData = contextData;
                this.userProfile.stateStack = {
                  step: "awaiting_order_confirmation",
                };
                reply = `🚚 You've chosen **${contextData.deliveryMethod}**.\n\n👉 Would you like to place this order?\nReply with "yes" to place or "no" to abort.`;
              } else {
                reply = "❓ Please choose either **delivery** or **takeaway**.";
              }
              break;
            }
            if (step === "awaiting_order_confirmation") {
              if (text.includes("yes")) {
                const order = await createOrder(
                  this.userProfile.userId,
                  this.userProfile.cart
                );
                if (!order) {
                  reply = "⚠️ Failed to place your order. Please try again.";
                  this.userProfile.currentIntent = null;
                  this.userProfile.stateStack = null;
                  this.userProfile.contextData = {};
                  break;
                }
                contextData.currentOrderId = order.id;
                contextData.totalAmount = order.total_amount;
                this.userProfile.contextData = contextData;
                this.userProfile.stateStack = {
                  step: "awaiting_payment",
                };
                reply = `✅ Order placed! Order ID: ${order.id}\n\n💳 Total payable: ₹${order.total_amount}\n\nType \"pay now\" to pay or \"cash on delivery\" to avail cash on delivery.`;
                for (const item of this.userProfile.cart) {
                  await setUserBehavior({
                    userId: this.userProfile.userId,
                    menuItemId: item.itemId,
                    menuId: item.menuId,
                    actionType: "order",
                  });
                }
                break;
              } else {
                reply =
                  "❌ Order cancelled. Let me know if you want to do something else.";
                this.userProfile.currentIntent = null;
                this.userProfile.stateStack = null;
                this.userProfile.contextData = {};
                break;
              }
            }
            if (step === "awaiting_payment") {
              if (text.includes("confirm") || text.includes("pay now")) {
                // Simulates "paid" payment
                const success = await createPaymentOrder(
                  contextData.currentOrderId,
                  contextData.totalAmount,
                  "paid"
                );
                if (success) {
                  reply = `✅ Payment successful for Order ID ${contextData.currentOrderId}. Thank you!\n\nWhat would you like to do next?`;
                } else {
                  reply =
                    "⚠️ Failed to record payment. Please contact support.";
                }
                this.userProfile.currentIntent = null;
                this.userProfile.stateStack = null;
                this.userProfile.contextData = {};
                break;
              } else if (text.includes("cash on delivery")) {
                // Simulates "cash on delivery" payment
                await createPaymentOrder(
                  contextData.currentOrderId,
                  contextData.totalAmount,
                  "cash on delivery"
                );
                reply =
                  "⏸️ Payment set for cash on delivery. What would you like to do next?";
                this.userProfile.currentIntent = null;
                this.userProfile.stateStack = null;
                this.userProfile.contextData = {};
                break;
              } else {
                // Simulates "pending" payment
                await createPaymentOrder(
                  contextData.currentOrderId,
                  contextData.totalAmount,
                  "pending"
                );
                reply = "❌ Payment cancelled. What would you like to do next?";
                this.userProfile.currentIntent = null;
                this.userProfile.stateStack = null;
                this.userProfile.contextData = {};
                break;
              }
            }
          } catch (error) {
            console.error("[PayOrder Error]", error);
            reply =
              "⚠️ An error occurred while processing your order. Please try again later.";
            reply = this.userProfile.currentIntent = null;
            this.userProfile.stateStack = null;
            this.userProfile.contextData = {};
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // Recommendation ==>
        case "RecommendItem": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to get recommendations.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "initial";
          const contextData = this.userProfile.contextData || {};
          try {
            if (step === "initial") {
              this.userProfile.stateStack = { step: "awaiting_category" };
              reply =
                "🍳 What type of item would you like recommendations for? (eg, pizza, pasta, drinks)";
              break;
            }
            if (step === "awaiting_category") {
              if (!text || !text.trim()) {
                reply =
                  "❓ Please provide a valid category or type (eg, pasta, burger, dessert).";
                break;
              }
              const category = text.trim();
              const recommendedItems = await getRecommendedItems(
                this.userProfile.userId,
                category
              );
              if (!recommendedItems || recommendedItems.length === 0) {
                reply = `☹️ No recommendations available for "${category}" right now. Try a different category?`;
                break;
              }
              reply =
                `🔥 Here are some top picks for "${category}":` +
                recommendedItems
                  .map((item) => `\n\n• ${item.name} - ₹${item.price}`)
                  .join("\n") +
                `\n\n👉 Want to:\n\n• 🛍️ Order one of these?\n\n• 👀 See recommendations for another category?`;
              this.userProfile.stateStack = null;
              this.userProfile.contextData = {};
            }
          } catch (error) {
            console.error("[RecommendItem Error]", error);
            reply =
              "⚠️ An error occurred while fetching recommendations. Please try again later.";
            this.userProfile.stateStack = null;
            this.userProfile.contextData = {};
          }
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // Reservations ==>                                                                  [DONE]
        case "MakeReservation": {
          if (!this.userProfile?.userId) {
            reply = "❌ You're not logged in. Please log in to book a table.";
            break;
          }
          const contextData = this.userProfile.contextData || {};
          const step =
            this.userProfile.stateStack?.step || "awaiting_restaurant";
          if (contextData.restaurantName && !contextData.finalRestaurant) {
            contextData.finalRestaurant = contextData.restaurantName;
          }
          if (
            contextData.partySize &&
            typeof contextData.partySize === "string"
          ) {
            contextData.partySize = parseInt(contextData.partySize);
          }
          try {
            if (step === "awaiting_restaurant") {
              if (!contextData.finalRestaurant || !contextData.restaurantName) {
                this.userProfile.stateStack = { step: "awaiting_restaurant" };
                reply =
                  "❓ Please provide the name of the restaurant you'd like to book.";
                break;
              }
              this.userProfile.stateStack = { step: "awaiting_date" };
              reply = `📍 You've selected **${contextData.finalRestaurant}**.\n\n📅 Please provide the reservation date (YYYY-MM-DD):`;
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
                "⏰ Thanks! Now, what time would you like to book (eg, 18:30)?";
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
              this.userProfile.stateStack = { step: "awaiting_notes" };
              reply =
                '📝 Would you like to add any special requests (eg, window seat, allergy info)? If not, type "no".';
              break;
            }
            if (step === "awaiting_notes") {
              contextData.notes =
                text && text.toLowerCase() !== "no" ? text : "";
              this.userProfile.stateStack = { step: "confirming_booking" };
              reply =
                `✅ ${contextData.finalRestaurant} has availability on ${contextData.date} at ${contextData.time} for ${contextData.partySize} people.` +
                (contextData.notes
                  ? `\n\n📝 Special Request: "${contextData.notes}"`
                  : "") +
                `\n\n👉 Type "yes" to book or "no" to abort.`;
              break;
            }
            if (step === "confirming_booking") {
              if (text.includes("yes")) {
                const { finalRestaurant, partySize, date, time } = contextData;
                const success = await makeReservation(
                  this.userProfile.userId,
                  finalRestaurant,
                  partySize,
                  date,
                  time,
                  notes || null
                );
                if (success) {
                  reply =
                    `✅ Your table at **${finalRestaurant}** for ${partySize} has been booked on ${date} at ${time}!` +
                    (notes ? `\n📝 Special Request noted: "${notes}"` : "");
                } else {
                  reply = `❌ Could not complete the booking. It might no longer be available. Try a different time or restaurant.`;
                }
              } else {
                reply = `❌ Booking cancelled.`;
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
            reply =
              "❌ You're not logged in. Please log in to cancel a reservation.";
            break;
          }
          const step = this.userProfile.stateStack?.step || "initial";
          try {
            if (step === "initial") {
              const userReservations = await getUserReservations(
                this.userProfile.userId
              );
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
                  ? `❌ Your reservation (ID: ${res.id}) has been cancelled.`
                  : `⚠️ Could not cancel reservation ${res.id}. It might already be cancelled.`;
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

        case "ModifyReservation": {
          if (!this.userProfile?.userId) {
            reply =
              "❌ You're not logged in. Please log in to modify reservation.";
            break;
          }
          const contextData = this.userProfile.contextData || {};
          const step = this.userProfile.stateStack?.step || "initial";
          try {
            if (step === "initial") {
              const userReservations = await getUserReservations(
                this.userProfile.userId
              );
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
              reply = "⏰ Thanks! Now, what is the new time (eg, 18:30)?";
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
              reply = `✅ You're about to modify reservation ${contextData.reservationId}:\n\n📅 Date: ${contextData.newDate}\n\n⏰ Time: ${contextData.newTime}\n\n👥 Party Size: ${partySize}\n\n👉 Reply "yes" to confirm or "no" to abort.`;
              break;
            }
            if (step === "confirming_modification") {
              if (text.includes("yes")) {
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
            reply =
              "❌ You're not logged in. Please log in to check reservations.";
            break;
          }
          try {
            const reservations = await getUserReservations(
              this.userProfile.userId
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
              location &&
              location.includes(this.userProfile.contextData.cuisine)
            ) {
              this.userProfile.contextData.location = null;
            }
            if (
              this.userProfile.contextData.restaurantName &&
              location &&
              location === this.userProfile.contextData.restaurantName
            ) {
              location = null;
            }
            const results = await searchRestaurants({
              restaurantName: this.userProfile.contextData.restaurantName,
              location: location,
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
          this.userProfile.currentIntent = null;
          this.userProfile.stateStack = null;
          this.userProfile.contextData = {};
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
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
          await this.userProfileAccessor.set(context, this.userProfile);
          await this.conversationState.saveChanges(context);
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
        else {
          await context.sendActivity("❌ Not a valid email.");
          await context.sendActivity("📧 Please enter your email:");
          break;
        }
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
          await context.sendActivity(
            "👉 You can now try:\n\n" + this.optionsMessage
          );
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
          await context.sendActivity(
            "👉 You can now try:\n\n" + this.optionsMessage
          );
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
