// backend/bot/bot.js

const {
  ConversationState,
  MemoryStorage,
  ActivityHandler,
} = require("botbuilder");
const { getIntentAndEntities } = require("./cluClient");

const { loginUser, signupUser } = require("../controllers/authController");
const {
  getMenuItemDetails,
  getMenuByRestaurantName,
  getMenuItemByName,
  getMenuItems,
  getMenus,
} = require("../controllers/menuController");
const {
  isRestaurantAcceptingOrders,
  ConfirmOrder,
  getUserOrders,
  getLatestOrder,
  cancelLatestOrder,
} = require("../controllers/ordersController");
const { getPaymentStatus } = require("../controllers/paymentController");
const { rateItem, rateRestaurant } = require("../controllers/ratingController");
const {
  getRecommendedItems,
} = require("../controllers/recommendationController");
const {
  makeReservation,
  getUserReservations,
  cancelReservation,
} = require("../controllers/reservationController");
const {
  getAllRestaurants,
  searchRestaurants,
  findRestaurant,
} = require("../controllers/restaurantController");

const { convertTo24Hour } = require("../utils/utils");

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage); // Conversation state

class RestaurantBot extends ActivityHandler {
  async handleAuthentication(userProfile, text, context) {
    switch (userProfile.state) {
      case "choosing_auth_mode": {
        if (text.toLowerCase() === "login") {
          userProfile.state = "login_email";
          await context.sendActivity("📧 Please enter your email:");
        } else if (text.toLowerCase() === "signup") {
          userProfile.state = "signup_name";
          await context.sendActivity("📝 Please enter your name:");
        } else {
          await context.sendActivity(`❓ Please type "login" or "signup".`);
        }
        break;
      }
      case "login_email": {
        userProfile.email = text;
        userProfile.state = "login_password";
        await context.sendActivity("🔐 Please enter your password:");
        break;
      }
      case "login_password": {
        const email = userProfile.email;
        const password = text;
        const authResult = await loginUser(email, password);
        if (authResult) {
          userProfile.isAuthenticated = true;
          userProfile.userId = authResult.user.id;
          userProfile.token = authResult.token;
          userProfile.state = "authenticated";
          await context.sendActivity(
            `✅ Welcome, ${email}! You're now logged in.\n\n`
          );
          await context.sendActivity(
            "You can now try:\n\n" +
              "• 📅 Book a table\n\n" +
              "• 🍔 Show menu\n\n" +
              "• 🔍 Search for a restaurant\n\n" +
              "• 📋 Show my reservations\n\n" +
              "• ❓ Ask for help\n\n"
          );
        } else {
          await context.sendActivity(
            `❌ Invalid email or password. Try "login" or "signup".`
          );
          userProfile.state = "choosing_auth_mode"; // Reset state
        }
        break;
      }
      case "signup_name": {
        userProfile.name = text;
        userProfile.state = "signup_email";
        await context.sendActivity("📧 Please enter your email:");
        break;
      }
      case "signup_email": {
        userProfile.email = text;
        userProfile.state = "signup_password";
        await context.sendActivity("🔐 Please enter your password:");
        break;
      }
      case "signup_password": {
        const name = userProfile.name;
        const email = userProfile.email;
        const password = text;
        const result = await signupUser(name, email, password);
        if (result) {
          userProfile.isAuthenticated = true;
          userProfile.userId = result.id;
          userProfile.state = "authenticated";
          await context.sendActivity(
            `✅ Welcome ${name}! You're now registered and logged in.\n\n`
          );
          await context.sendActivity(
            "You can now try:\n\n" +
              "• 📅 Book a table\n\n" +
              "• 🍔 Show menu\n\n" +
              "• 🔍 Search for a restaurant\n\n" +
              "• 📋 Show my reservations\n\n" +
              "• ❓ Ask for help\n\n"
          );
        } else {
          await context.sendActivity(
            `❌ Registration failed. Try "signup" or "login".`
          );
          userProfile.state = "choosing_auth_mode"; // Reset state
        }
        break;
      }
    }
    await this.userProfileAccessor.set(context, userProfile);
    await this.conversationState.saveChanges(context);
  }

  constructor() {
    super();
    this.conversationState = conversationState;
    this.userProfileAccessor = conversationState.createProperty("userProfile");
    this.onMessage(async (context, next) => {
      const userProfile = await this.userProfileAccessor.get(context, {
        isAuthenticated: false,
        state: "choosing_auth_mode",
        userId: null,
        email: null,
        cart: [],
        generalGreetingState: "new",
      });
      const text = context.activity.text.trim();

      // AUTHENTICATION HANDLER
      if (!userProfile.isAuthenticated) {
        await this.handleAuthentication(userProfile, text, context);
        return;
      }

      // AUTHENTICATED USER LOGIC
      const { topIntent, entities } = await getIntentAndEntities(text);
      // console.log(`CLU detected intent: ${topIntent}`);
      console.log(`CLU entities: `, entities);

      // Extract common entities for convenience
      const entity = (name) => entities.find((e) => e.category === name)?.text;

      const rName = entity("restaurantName");
      const mItem = entity("menuItem");
      const pSize = parseInt(entity("partySize")) || 2;
      const dateEntity = entity("date");
      const timeEntity = entity("time");
      const orderId = entity("orderID");
      const status = entity("orderStatus");
      const menuId = entity("menuID");
      const userLocation = entity("userLocation");
      const cuisine = entity("cuisine");
      const priceRange = entity("priceRange");
      const ratingValue = entity("ratingValue");
      const ratingComment = entity("ratingComment");
      const reservationId = entity("reservationID");

      let reply;

      // Date/time parsing
      let reservationDate = new Date();
      if (dateEntity && dateEntity.toLowerCase().includes("tomorrow")) {
        reservationDate.setDate(reservationDate.getDate() + 1);
      } else if (dateEntity && !isNaN(new Date(dateEntity).getTime())) {
        reservationDate = new Date(dateEntity);
      }
      if (timeEntity) {
        const match = timeEntity.match(/\d+(?::\d+)?\s*(am|pm)/i);
        if (match) {
          time24hr = convertTo24Hour(match[0]);
        }
      }
      const dateStr = reservationDate.toISOString().split("T")[0];

      console.log("\n" + topIntent + "\n");
      switch (topIntent) {
        // Cart ==>
        case "AddToCart": {
          try {
            if (!userProfile?.userId) {
              reply =
                "❌ You're not logged in. Please log in to add items to your cart.";
              break;
            }
            if (!mItem && !userProfile.currentItem) {
              reply =
                "❓ Please tell me the name of the item you'd like to add.";
              break;
            }
            if (!userProfile.addItemState) {
              const item = await getMenuItemByName(mItem);
              if (!item) {
                reply = `❌ Sorry, I couldn't find **${mItem}** in our menu. Try another item.`;
                break;
              }
              const quantity =
                text && !isNaN(parseInt(text)) && parseInt(text) > 0
                  ? parseInt(text)
                  : null;
              if (quantity) {
                if (!userProfile.cart) userProfile.cart = [];
                userProfile.cart.push({
                  itemId: item.id,
                  itemName: item.name,
                  quantity,
                  price: item.price,
                });
                reply = `✅ I've added ${quantity} x **${item.name}** to your cart.\n\nWhat would you like to do next?\n• 🛍️ Add more items\n• 🧾 View your cart\n• ✅ Proceed to checkout\n• ❌ Remove an item`;
              } else {
                userProfile.currentItem = item.name;
                userProfile.currentItemId = item.id;
                userProfile.currentItemPrice = item.price;
                userProfile.addItemState = "awaiting_quantity";
                reply = `🍴 You'd like to add **${item.name}**.\n👉 How many would you like to order?`;
              }
              break;
            } else if (userProfile.addItemState === "awaiting_quantity") {
              const quantity = parseInt(text);
              if (!quantity || quantity <= 0) {
                reply =
                  "❓ Please provide a valid quantity (a number greater than 0).";
              } else {
                if (!userProfile.cart) userProfile.cart = [];
                userProfile.cart.push({
                  itemId: userProfile.currentItemId,
                  itemName: userProfile.currentItem,
                  quantity,
                  price: userProfile.currentItemPrice,
                });
                reply = `✅ I've added ${quantity} x **${userProfile.currentItem}** to your cart.\n\nWhat would you like to do next?\n• 🛍️ Add more items\n• 🧾 View your cart\n• ✅ Proceed to checkout\n• ❌ Remove an item`;
                // Reset state
                delete userProfile.currentItem;
                delete userProfile.currentItemId;
                delete userProfile.currentItemPrice;
                delete userProfile.addItemState;
              }
              break;
            } else {
              reply =
                "🤔 An unexpected error occurred while trying to add the item. Let’s start over.";
              delete userProfile.currentItem;
              delete userProfile.currentItemId;
              delete userProfile.currentItemPrice;
              delete userProfile.addItemState;
              break;
            }
          } catch (error) {
            console.error("[AddToCart Error]", error);
            reply =
              "⚠️ An error occurred while trying to add the item to your cart. Please try again later.";
          } finally {
            await this.userProfileAccessor.set(context, userProfile);
            await this.conversationState.saveChanges(context);
            break;
          }
        }

        case "RemoveFromCart": {
          try {
            if (!userProfile?.userId) {
              reply =
                "❌ You're not logged in. Please log in to remove items from your cart.";
              break;
            }
            if (!mItem) {
              reply = "❓ Please specify the item you want to remove.";
              break;
            }
            const cartItems = await getUserCartItems(userProfile.userId);
            const itemInCart = cartItems.find(
              (item) => item.name.toLowerCase() === mItem.toLowerCase()
            );
            if (!itemInCart) {
              reply = `❌ It looks like **${mItem}** isn't in your cart.\n\nPlease try another item or view your cart for available items.`;
              break;
            }
            if (!userProfile.removeItemState) {
              userProfile.currentItemToRemove = mItem;
              userProfile.removeItemState = "confirm_removal";
              reply = `❓ Are you sure you want to remove **${mItem}** (Qty: ${itemInCart.quantity}) from your cart?\n\nReply with **Yes** or **No**.`;
              break;
            } else if (userProfile.removeItemState === "confirm_removal") {
              if (text?.toLowerCase() === "yes") {
                const removed = await removeItemFromUserCart(
                  userProfile.userId,
                  itemInCart.id
                );
                reply = removed
                  ? `✅ **${mItem}** has been removed from your cart.\n\nWhat would you like to do next?\n• 🛍️ Add more items\n• 🧾 View cart\n• ✅ Proceed to checkout`
                  : `❌ Could not remove **${mItem}** from your cart. Please try again later.`;
                delete userProfile.currentItemToRemove;
                delete userProfile.removeItemState;
              } else {
                reply = "❎ No changes have been made to your cart.";
                delete userProfile.currentItemToRemove;
                delete userProfile.removeItemState;
              }
              break;
            } else {
              reply = "🤔 An unexpected error occurred. Let's start over.";
              delete userProfile.currentItemToRemove;
              delete userProfile.removeItemState;
              break;
            }
          } catch (error) {
            console.error("[RemoveFromCart Error]", error);
            reply =
              "⚠️ An error occurred while trying to remove the item. Please try again later.";
            delete userProfile.currentItemToRemove;
            delete userProfile.removeItemState;
          } finally {
            await this.userProfileAccessor.set(context, userProfile);
            await this.conversationState.saveChanges(context);
            break;
          }
        }
        case "ViewCart": {
          break;
        }
        case "EditCart": {
          break;
        }
        case "ClearCart": {
          break;
        }

        // Extra ==>
        case "None": {
          switch (userProfile.currentState) {
            case undefined:
              reply =
                "🤔 Sorry, I didn't understand your request.\n\n" +
                "Here's what I can help you with:\n" +
                "• 🗓️ Book a table\n" +
                "• 🍔 Place an order\n" +
                "• 📋 View your reservations\n" +
                "• 💳 Make a payment\n" +
                "• ❓ Ask for help\n\n" +
                "👉 You can also type 'menu' or 'help' for a full list of options.";
              break;

            default:
              reply =
                "🤔 Sorry, I didn't understand your request at this step.\n" +
                "If you'd like, I can help you restart or continue where we left off.\n\n" +
                "✅ Type 'restart' to start fresh.\n" +
                "↩️ Or continue with your previous request.";
              break;
          }
          break;
        }

        case "GeneralGreeting": {
          switch (userProfile.generalGreetingState) {
            case "new": {
              userProfile.generalGreetingState = "greeted";
              reply =
                "👋 Hello! Welcome to Restaurant Bot\n\n" +
                "Here's what I can help you with:\n\n" +
                "• 🍔 Find restaurants by cuisine or location\n\n" +
                "• 📋 Show menu for a specific restaurant\n\n" +
                "• 📅 Book or cancel a reservation\n\n" +
                "• 🛍️ Place an order for pickup or delivery\n\n" +
                "• 💳 Make a payment or check its status\n\n" +
                "• 🌟 Get recommendations or review restaurants\n\n" +
                "👉 Just tell me what you'd like to do.";
              break;
            }
            case "greeted": {
              reply =
                "👋 You're already here with me!\n\n" +
                "If you're not sure where to start, here are some ideas:\n\n" +
                '• Try: "Search for Italian restaurants near me"\n\n' +
                '• Try: "Book a table for 4 tomorrow evening"\n\n' +
                '• Try: "Place an order for pizza at XYZ Restaurant"\n\n' +
                '• Try: "Check status of my order #1234"\n\n\n' +
                "👉 Let me know how I can help.";
              break;
            }
            default: {
              delete userProfile.generalGreetingState; // Reset state
              reply =
                "👋 Hi again! How can I help you with restaurant searches, bookings, or orders today?";
              break;
            }
          }
          await this.userProfileAccessor.set(context, userProfile);
          await this.conversationState.saveChanges(context);
          break;
        }

        // Menu ==>
        case "ShowMenu": {
          try {
            if (!rName) {
              reply = "❓ Please specify the name of the restaurant.";
              break;
            }
            const menu = await getMenuByRestaurantName(rName);
            if (!menu || menu.length === 0) {
              reply = `😔 Sorry, I couldn't find a menu for "${rName}". Try another restaurant?`;
            } else {
              const groupedMenu = menu.reduce((acc, item) => {
                const category = item.category || "Other"; // Fallback category
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
              }, {});
              reply = `🍽️ Menu for ${rName}:\n\n`;
              for (const [category, items] of Object.entries(groupedMenu)) {
                reply += `👑 ${category.toUpperCase()}:\n`;
                reply += items
                  .map(
                    (i) =>
                      `• ${i.name} — ₹${i.price}${
                        i.description ? `\n  💡 ${i.description}` : ""
                      }`
                  )
                  .join("\n");
                reply += "\n\n";
              }
              reply +=
                "👉 Would you like to:\n• 🛍️ Add an item to your cart\n• 📋 View another menu\n• 🗓️ Book a table?";
              userProfile.currentRestaurant = rName; // Maintain state for next action
            }
          } catch (error) {
            console.error("[ShowMenu Error]", error);
            reply =
              "⚠️ An error occurred while retrieving the menu. Please try again later.";
          }
          break;
        }

        // Order ==>
        case "CheckOrderStatus": {
          try {
            if (!userProfile?.userId) {
              reply =
                "❌ You're not logged in. Please log in to check your order status.";
              break;
            }
            if (!orderId) {
              const userOrders = await getUserOrders(userProfile.userId);
              if (!userOrders || userOrders.length === 0) {
                reply = "ℹ️ You have no recent or active orders.";
              } else if (userOrders.length === 1) {
                const order = userOrders[0];
                reply = `📦 Your only order (#${order.id}) is currently ${
                  order.status || "unknown status"
                }.`;
              } else {
                reply =
                  "📋 Here are your recent or active orders:\n\n" +
                  userOrders
                    .map(
                      (o) =>
                        `• Order #${o.id} — Status: ${
                          o.status || "unknown status"
                        } — Total: ₹${o.total_amount}`
                    )
                    .join("\n") +
                  `\n\n👉 Please provide the Order ID you want to check the status for.`;
                userProfile.state = "choosing_order_for_status"; // Await next reply
              }
            } else {
              const order = await getOrderById(orderId, userProfile.userId);
              if (!order) {
                reply = `❓ No order found for Order ID ${orderId}. Please verify and try again.`;
              } else {
                const status = order.status || "unknown status";
                reply = `📦 Order ${orderId} is currently ${status}.`;
              }
            }
          } catch (error) {
            console.error("[CheckOrderStatus Error]", error);
            reply =
              "⚠️ An error occurred while trying to fetch your order status. Please try again later.";
          }
          break;
        }

        case "CancelOrder": {
          try {
            if (!userProfile?.userId) {
              reply =
                "❌ You're not logged in. Please log in to manage your orders.";
              break;
            }
            const orders = await getUserOrders(userProfile.userId);
            if (!orders || orders.length === 0) {
              reply =
                "🤔 You don't have any active or recent orders to cancel.";
              break;
            }
            if (orders.length === 1) {
              const order = orders[0];
              reply = `📋 You have an active order:\n\n• Order #${order.id} — Status: ${order.status}\n\nWould you like to cancel this order?\n\n✅ Type "yes" to cancel\n❌ Type "no" to keep it.`;
              userProfile.currentOrderId = order.id;
              userProfile.state = "confirm_single_order_cancellation"; // Await user confirmation
            } else {
              reply =
                "📋 You have multiple active orders. Here are your options:\n\n" +
                orders
                  .map((o) => `• Order #${o.id} — Status: ${o.status}`)
                  .join("\n") +
                '\n\n👉 Type the Order ID you want to cancel, or type "all" to cancel all active orders.';
              userProfile.state = "choosing_order_for_cancellation"; // Await next reply
            }
          } catch (error) {
            console.error("[CancelOrder Error]", error);
            reply =
              "⚠️ An error occurred while trying to cancel your order. Please try again later.";
            userProfile.state = "idle"; // Reset state in case of error
          }
          break;
        }

        case "ConfirmOrder": {
          try {
            if (!userProfile?.userId) {
              reply =
                "❌ You're not logged in. Please log in to place an order.";
              break;
            }
            if (!mItem || !rName || !quantity) {
              reply = !mItem
                ? "❓ Please tell me which item you'd like to order."
                : !rName
                ? "❓ Please provide the restaurant name."
                : "❓ Please specify the quantity.";
              break;
            }
            const isAcceptingOrders = await isRestaurantAcceptingOrders(rName);
            if (!isAcceptingOrders) {
              reply = `⛔ ${rName} is currently not accepting orders. Would you like to choose another restaurant?`;
              break;
            }
            const itemDetails = await getMenuItemDetails(rName, mItem);
            if (!itemDetails) {
              reply = `❌ We couldn't find ${mItem} at ${rName}. Try verifying the item name.`;
              break;
            }
            const totalCost = itemDetails.price * quantity;
            if (!userProfile.orderConfirmationState) {
              userProfile.currentOrder = {
                item: mItem,
                quantity,
                restaurant: rName,
                totalCost,
              };
              userProfile.orderConfirmationState = "awaiting_confirmation";
              reply =
                `🛍️ You're about to order ${quantity} x ${mItem} from ${rName}.\n` +
                `💵 Total Cost: ₹${totalCost}\n\n` +
                `✅ Do you want to confirm this order?\n` +
                `Reply with "Yes" to confirm or "No" to cancel.`;
              break;
            } else if (
              userProfile.orderConfirmationState === "awaiting_confirmation"
            ) {
              if (text?.toLowerCase() === "yes") {
                const placed = await ConfirmOrder(rName, userProfile.userId, [
                  { name: mItem, quantity },
                ]);
                if (placed) {
                  reply = `✅ Your order for ${quantity} x ${mItem} at ${rName} has been placed successfully!\n\n👉 What would you like to do next?\n• 🛍️ Place another order\n• 📋 View your orders\n• ❓ Ask for help`;
                } else {
                  reply =
                    "⚠️ An error occurred while placing your order. Please try again.";
                }
              } else {
                reply = "❎ No problem! I've cancelled your order request.";
              }
              delete userProfile.currentOrder;
              delete userProfile.orderConfirmationState;
              break;
            } else {
              reply = "🤔 An unexpected error occurred. Let's start over.";
              delete userProfile.currentOrder;
              delete userProfile.orderConfirmationState;
              break;
            }
          } catch (error) {
            console.error("[ConfirmOrder Error]", error);
            reply =
              "⚠️ An error occurred while trying to place your order. Please try again later.";
          }
          break;
        }

        // Payment ==>
        case "CheckPaymentStatus": {
          switch (userProfile.paymentCheckState) {
            case undefined: {
              if (!orderId) {
                reply = "❓ Please provide the Order ID you'd like to check.";
              } else {
                const payment = await getPaymentStatus(
                  orderId,
                  userProfile.userId
                );
                if (!payment) {
                  reply = `❓ No payment information found for order ${orderId}.`;
                } else {
                  switch (payment.status) {
                    case "paid":
                      reply = `✅ Payment for order ${orderId} has been successfully completed.\n\n👉 What would you like to do next?\n• 🗓️ Book a table\n• 🍔 Place a new order\n• 📋 View my orders\n• ❓ Ask for help`;
                      break;
                    case "pending":
                      reply = `⏳ Payment for order ${orderId} is still *pending*. Would you like to:\n\n• 💳 Try paying again?\n• ❌ Cancel this order?\n\nPlease type "pay" to try again or "cancel" to cancel the order.`;
                      userProfile.paymentCheckState = "pending_payment_action";
                      userProfile.currentOrderId = orderId;
                      break;
                    case "failed":
                      reply = `⚠️ Payment for order ${orderId} has *failed*.\n\n👉 Would you like to try paying again, or cancel the order?\n• Type "pay" to try again\n• Type "cancel" to cancel the order.`;
                      userProfile.paymentCheckState = "pending_payment_action";
                      userProfile.currentOrderId = orderId;
                      break;
                    default:
                      reply = `ℹ️ The payment status for order ${orderId} is *${payment.status}*.\n\n👉 Let me know if you'd like help with next steps!`;
                      break;
                  }
                }
              }
              break;
            }
            case "pending_payment_action": {
              if (text && text.toLowerCase() === "pay") {
                reply = `💳 Let's try making the payment again for order ${userProfile.currentOrderId}. Please type "make payment" to proceed.`;
              } else if (text && text.toLowerCase() === "cancel") {
                reply = `❌ You've chosen to cancel order ${userProfile.currentOrderId}. Type "cancel order" to confirm.`;
              } else {
                reply = `❓ Please respond with "pay" or "cancel" for order ${userProfile.currentOrderId}.`;
              }
              // Reset state if user chooses one of the valid options
              if (text && ["pay", "cancel"].includes(text.toLowerCase())) {
                delete userProfile.paymentCheckState;
                delete userProfile.currentOrderId;
              }
              break;
            }
            default: {
              reply =
                "🤔 An error occurred while trying to check the payment status. Let's start over.";
              delete userProfile.paymentCheckState;
              delete userProfile.currentOrderId;
              break;
            }
          }
          break;
        }

        case "MakePayment": {
          switch (userProfile.paymentState) {
            case undefined: {
              if (!orderId) {
                reply = "❓ Please provide the Order ID you'd like to pay.";
              } else {
                const order = await getOrderById(orderId, userProfile.userId);
                if (!order) {
                  reply = `⚠️ No order found with ID ${orderId}. Please try again.`;
                } else if (order.payment_status === "paid") {
                  reply = `✅ Order ${orderId} has already been paid.\n\n👉 What would you like to do next?\n• 📋 View my orders\n• 🗓️ Book a table\n• ❓ Ask for help`;
                } else {
                  userProfile.currentOrderId = orderId;
                  userProfile.currentOrderAmount = order.total_amount;
                  userProfile.paymentState = "confirming_payment";
                  reply = `💳 The total for order ${orderId} is *₹${order.total_amount}*.\n\n👉 Do you want to proceed with the payment?\nType "confirm" to proceed or "cancel" to abort.`;
                }
              }
              break;
            }
            case "confirming_payment": {
              if (text && text.toLowerCase() === "confirm") {
                try {
                  const result = await createPaymentIntent(
                    userProfile.currentOrderId,
                    userProfile.currentOrderAmount
                  );
                  reply = `✅ I've created a secure payment link for order ${userProfile.currentOrderId}.\n\n👉 Click here to pay: ${result.clientSecret}\n\n💳 After making the payment, you can type "check status" to confirm.`;
                } catch (error) {
                  console.error(error);
                  reply = `⚠️ An error occurred while creating the payment link. Please try again later.`;
                }
              } else {
                reply =
                  "❌ Payment cancelled.\n\n👉 What would you like to do next?\n• 🗓️ Book a table\n• 🍔 Place an order\n• 📋 View my orders\n• ❓ Ask for help.";
              }
              // Reset state regardless
              delete userProfile.currentOrderId;
              delete userProfile.currentOrderAmount;
              delete userProfile.paymentState;
              break;
            }
            default: {
              reply =
                "🤔 An error occurred while trying to process your payment. Let's start over.";
              delete userProfile.currentOrderId;
              delete userProfile.currentOrderAmount;
              delete userProfile.paymentState;
              break;
            }
          }
          break;
        }

        // Recommendation ==>
        case "RecommendItem": {
          try {
            if (!userProfile?.userId) {
              reply =
                "❌ You're not logged in. Please log in to get recommendations.";
              break;
            }
            if (!category && !userProfile.recommendationCategoryRequested) {
              reply =
                "🍳 What category or type of item would you like recommendations for? (e.g., pizza, pasta, drinks)";
              userProfile.recommendationCategoryRequested = true;
              break;
            } else {
              const categoryToUse =
                category || userProfile.lastRequestedCategory;
              const recommendations = await getRecommendedItems(categoryToUse);
              if (!recommendations || recommendations.length === 0) {
                reply = categoryToUse
                  ? `☹️ No recommendations available for "${categoryToUse}" right now. Would you like recommendations for another category?`
                  : "☹️ No recommendations available right now.";
                delete userProfile.recommendationCategoryRequested;
                delete userProfile.lastRequestedCategory;
                break;
              }
              reply =
                `🔥 Here are some recommendations for ${
                  categoryToUse || "you"
                }:\n` +
                recommendations
                  .map((item) => `• ${item.name} - ₹${item.price}`)
                  .join("\n") +
                `\n\n👉 Would you like to:\n` +
                "• 🛍️ Order one of these?\n" +
                "• 👀 See recommendations for another category?\n" +
                "• ❓ Ask for help?";
              userProfile.lastRequestedCategory = categoryToUse;
              delete userProfile.recommendationCategoryRequested;
            }
          } catch (error) {
            console.error("[RecommendItem Error]", error);
            reply =
              "⚠️ An error occurred while fetching recommendations. Please try again later.";
            delete userProfile.recommendationCategoryRequested;
            delete userProfile.lastRequestedCategory;
          }
          break;
        }

        // Reservations ==>
        case "BookTable": {
          switch (userProfile.bookTableState) {
            case undefined: {
              if (!rName) {
                reply =
                  "❓ Please provide the name of the restaurant you'd like to book.";
              } else {
                userProfile.bookingRestaurant = rName;
                userProfile.bookTableState = "awaiting_date";
                reply = `✏️ You've selected "${rName}".\n\n📅 Please provide the reservation date (YYYY-MM-DD):`;
              }
              break;
            }
            case "awaiting_date": {
              if (!text || isNaN(new Date(text).getTime())) {
                reply =
                  "❓ Please provide a valid date in the format YYYY-MM-DD.";
              } else {
                userProfile.bookingDate = text;
                userProfile.bookTableState = "awaiting_time";
                reply =
                  "⏰ Thanks! Now, what time would you like to book (e.g., 18:30)?";
              }
              break;
            }
            case "awaiting_time": {
              if (!text || !/^\d{2}:\d{2}$/.test(text)) {
                reply = "❓ Please provide a valid time in HH:MM (24h) format.";
              } else {
                userProfile.bookingTime = text;
                userProfile.bookTableState = "awaiting_party_size";
                reply =
                  "👥 Thanks! Now, how many people will be in your party?";
              }
              break;
            }
            case "awaiting_party_size": {
              const partySize = parseInt(text);
              if (!partySize || partySize <= 0) {
                reply = "❓ Please provide a valid number for the party size.";
              } else {
                userProfile.bookingPartySize = partySize;
                // Check availability
                const available = await checkTableAvailability(
                  userProfile.bookingRestaurant,
                  userProfile.bookingDate,
                  userProfile.bookingTime,
                  partySize
                );
                if (!available) {
                  reply = `❌ Sorry, ${userProfile.bookingRestaurant} is fully booked for ${userProfile.bookingDate} at ${userProfile.bookingTime}.\n\n👉 Try another date/time or pick another restaurant.`;
                  // Reset state
                  delete userProfile.bookingRestaurant;
                  delete userProfile.bookingDate;
                  delete userProfile.bookingTime;
                  delete userProfile.bookingPartySize;
                  delete userProfile.bookTableState;
                } else {
                  userProfile.bookTableState = "confirming_booking";
                  reply = `✅ ${userProfile.bookingRestaurant} has availability on ${userProfile.bookingDate} at ${userProfile.bookingTime} for ${userProfile.bookingPartySize} people.\n\n👉 Type "confirm" to book, or "cancel" to cancel this request.`;
                }
              }
              break;
            }
            case "confirming_booking": {
              if (text && text.toLowerCase() === "confirm") {
                const success = await makeReservation(
                  userProfile.bookingRestaurant,
                  userProfile.bookingPartySize,
                  userProfile.bookingDate,
                  userProfile.bookingTime
                );
                if (success) {
                  reply = `✅ Your table at ${userProfile.bookingRestaurant} for ${userProfile.bookingPartySize} has been booked on ${userProfile.bookingDate} at ${userProfile.bookingTime}!\n\n👉 What would you like to do next?\n• 🍔 Place an order\n• 📋 View my reservations\n• ❓ Ask for help`;
                } else {
                  reply = `❌ Could not book the table. It's possible it's no longer available.\n\n👉 Try another date/time or restaurant.`;
                }
              } else {
                reply =
                  "❌ Booking cancelled.\n\n👉 What would you like to do next?\n• 🗓️ Book another table\n• 📋 View my reservations\n• ❓ Ask for help";
              }
              // Reset state
              delete userProfile.bookingRestaurant;
              delete userProfile.bookingDate;
              delete userProfile.bookingTime;
              delete userProfile.bookingPartySize;
              delete userProfile.bookTableState;
              break;
            }
            default: {
              reply =
                "🤔 An error occurred while trying to book your table. Let's start over.";
              delete userProfile.bookingRestaurant;
              delete userProfile.bookingDate;
              delete userProfile.bookingTime;
              delete userProfile.bookingPartySize;
              delete userProfile.bookTableState;
              break;
            }
          }
          break;
        }

        case "CancelReservation": {
          try {
            if (!reservationId) {
              const userReservations = await getUserReservations(
                userProfile.userId
              );
              if (!userReservations || userReservations.length === 0) {
                reply = "ℹ️ You have no active reservations to cancel.";
              } else if (userReservations.length === 1) {
                const resId = userReservations[0].id;
                const cancelled = await cancelReservation(resId);
                reply = cancelled
                  ? `❌ Your reservation (ID: ${resId}) has been cancelled.\n\n👉 What would you like to do next?\n• 🗓️ Book a table\n• 🍔 Place an order\n• 📋 View my reservations\n• ❓ Ask for help`
                  : `⚠️ Could not cancel reservation ${resId}. It might already be cancelled.\n\n👉 What would you like to do next?\n• 🗓️ Book a table\n• 🍔 Place an order\n• 📋 View my reservations\n• ❓ Ask for help`;
              } else {
                reply =
                  "📋 You have multiple active reservations:\n\n" +
                  userReservations
                    .map(
                      (r) =>
                        `• ID ${r.id}: ${r.name} on ${r.reservation_date} at ${r.reservation_time}`
                    )
                    .join("\n") +
                  `\n\n👉 Please provide the Reservation ID you want to cancel.`;
                userProfile.state = "choosing_reservation_to_cancel"; // Set state
              }
            } else {
              const cancelledReservation = await cancelReservation(
                reservationId
              );
              reply = cancelledReservation
                ? `❌ Your reservation ${reservationId} has been cancelled.\n\n👉 What would you like to do next?\n• 🗓️ Book a table\n• 🍔 Place an order\n• 📋 View my reservations\n• ❓ Ask for help`
                : `⚠️ Could not cancel reservation ${reservationId}. It might not exist.\n\n👉 What would you like to do next?\n• 🗓️ Book a table\n• 🍔 Place an order\n• 📋 View my reservations\n• ❓ Ask for help`;
            }
          } catch (error) {
            console.error(error);
            reply =
              "⚠️ An error occurred while trying to cancel your reservation. Please try again later.";
          }
          break;
        }

        case "ModifyReservation": {
          try {
            if (!userProfile?.userId) {
              reply =
                "❌ You're not logged in. Please log in to modify a reservation.";
              break;
            }
            switch (userProfile.modifyReservationState) {
              case undefined: {
                if (!reservationId) {
                  reply =
                    "❓ Please provide the reservation ID you'd like to modify.";
                } else {
                  userProfile.currentReservationId = reservationId;
                  userProfile.modifyReservationState = "awaiting_new_date";
                  userProfile.modifyReservationStart = Date.now();
                  reply =
                    "✏️ You'd like to modify reservation " +
                    reservationId +
                    ".\n\nPlease provide the new date (YYYY-MM-DD):\n_(Type 'cancel' anytime to cancel)_";
                }
                break;
              }
              case "awaiting_new_date": {
                if (text?.toLowerCase() === "cancel") {
                  reply = "❌ Modification cancelled.";
                  delete userProfile.currentReservationId;
                  delete userProfile.modifyReservationState;
                  delete userProfile.newDate;
                  delete userProfile.newTime;
                  delete userProfile.newPartySize;
                  delete userProfile.modifyReservationStart;
                } else if (!text || isNaN(new Date(text).getTime())) {
                  reply =
                    "❓ Please provide a valid date in the format YYYY-MM-DD.";
                } else {
                  userProfile.newDate = text;
                  userProfile.modifyReservationState = "awaiting_new_time";
                  reply =
                    "⏰ Thanks! Now, what is the new time for the reservation (e.g., 18:30)?";
                }
                break;
              }
              case "awaiting_new_time": {
                if (text?.toLowerCase() === "cancel") {
                  reply = "❌ Modification cancelled.";
                  delete userProfile.currentReservationId;
                  delete userProfile.modifyReservationState;
                  delete userProfile.newDate;
                  delete userProfile.newTime;
                  delete userProfile.newPartySize;
                  delete userProfile.modifyReservationStart;
                } else if (!text || !/^\d{2}:\d{2}$/.test(text.trim())) {
                  reply = "❓ Please provide a valid time in HH:MM format.";
                } else {
                  userProfile.newTime = text.trim();
                  userProfile.modifyReservationState =
                    "awaiting_new_party_size";
                  reply =
                    "👥 Thanks! Now, how many people will be in your party?";
                }
                break;
              }
              case "awaiting_new_party_size": {
                if (text?.toLowerCase() === "cancel") {
                  reply = "❌ Modification cancelled.";
                  delete userProfile.currentReservationId;
                  delete userProfile.modifyReservationState;
                  delete userProfile.newDate;
                  delete userProfile.newTime;
                  delete userProfile.newPartySize;
                  delete userProfile.modifyReservationStart;
                } else {
                  const partySize = parseInt(text);
                  if (!partySize || partySize <= 0) {
                    reply =
                      "❓ Please provide a valid number for the party size.";
                  } else {
                    userProfile.newPartySize = partySize;
                    // ✅ Final confirmation
                    reply =
                      `✅ You're about to modify reservation ${userProfile.currentReservationId}:\n` +
                      `📅 New Date: ${userProfile.newDate}\n` +
                      `⏰ New Time: ${userProfile.newTime}\n` +
                      `👥 New Party Size: ${userProfile.newPartySize}\n\n` +
                      "Please confirm by replying 'yes' or cancel by replying 'cancel'.";
                    userProfile.modifyReservationState = "confirming_changes";
                  }
                }
                break;
              }
              case "confirming_changes": {
                if (text?.toLowerCase() === "yes") {
                  const modified = await modifyReservation(
                    userProfile.currentReservationId,
                    userProfile.newDate,
                    userProfile.newTime,
                    userProfile.newPartySize
                  );
                  reply = modified
                    ? `✅ Reservation ${userProfile.currentReservationId} has been successfully modified!`
                    : `❌ Could not modify reservation ${userProfile.currentReservationId}. It might no longer be editable.`;
                } else {
                  reply = "❌ Modification cancelled.";
                }
                // Reset state regardless
                delete userProfile.currentReservationId;
                delete userProfile.newDate;
                delete userProfile.newTime;
                delete userProfile.newPartySize;
                delete userProfile.modifyReservationState;
                delete userProfile.modifyReservationStart;
                break;
              }
              default: {
                reply =
                  "🤔 An unexpected error occurred. Let's start the modification process over.";
                delete userProfile.currentReservationId;
                delete userProfile.newDate;
                delete userProfile.newTime;
                delete userProfile.newPartySize;
                delete userProfile.modifyReservationState;
                delete userProfile.modifyReservationStart;
                break;
              }
            }
            // ✅ Timeout Check (5 minutes limit example)
            if (
              userProfile.modifyReservationStart &&
              Date.now() - userProfile.modifyReservationStart > 5 * 60 * 1000
            ) {
              reply = "⏳ This modification has timed out. Please start again.";
              delete userProfile.currentReservationId;
              delete userProfile.newDate;
              delete userProfile.newTime;
              delete userProfile.newPartySize;
              delete userProfile.modifyReservationState;
              delete userProfile.modifyReservationStart;
            }
          } catch (error) {
            console.error("[ModifyReservation Error]", error);
            reply =
              "⚠️ An error occurred while trying to modify your reservation. Please try again later.";
          }
          break;
        }

        case "ShowReservations": {
          try {
            const reservations = await getUserReservations(userProfile.userId);
            if (!reservations || reservations.length === 0) {
              reply = "ℹ️ You don't have any upcoming reservations.";
            } else {
              reply = "📅 Here are your upcoming reservations:\n\n";
              reply += reservations
                .map(
                  (res) =>
                    `• ID ${res.id}: ${res.name} on ${res.reservation_date} at ${res.reservation_time} for ${res.party_size} people`
                )
                .join("\n");
              reply +=
                "\n\n👉 What would you like to do?\n" +
                '• ❌ Cancel a reservation (type "CancelReservation")\n' +
                '• ✏️ Modify a reservation (type "ModifyReservation")\n' +
                "• 📋 View menu or book another table";
              userProfile.currentReservations = reservations; // Maintain state for quick follow-up
            }
          } catch (error) {
            console.error("[ShowReservations Error]", error);
            reply =
              "⚠️ An error occurred while retrieving your reservations. Please try again later.";
          }
          break;
        }

        // Restaurant ==>
        case "ReviewRestaurant": {
          try {
            if (!ratingComment && !userProfile.awaitingReviewComment) {
              reply = "💬 Please provide your review comment.";
              userProfile.awaitingReviewComment = true;
            } else if (ratingComment || userProfile.awaitingReviewComment) {
              const reviewText = ratingComment || text;
              if (!reviewText || reviewText.trim().length < 5) {
                reply =
                  "❓ Please provide a more detailed review (at least 5 characters).";
              } else {
                userProfile.currentReviewComment = reviewText;
                reply = `🗣️ You'd like to submit the following review:\n\n"${userProfile.currentReviewComment}"\n\n✅ Do you want to proceed with submitting this review?\nType "yes" to confirm or "no" to edit/cancel.`;
                userProfile.awaitingReviewConfirmation = true;
              }
            } else if (userProfile.awaitingReviewConfirmation && text) {
              if (text.toLowerCase() === "yes") {
                // Placeholder for actual review submission
                const success = true;
                reply = success
                  ? `🌟 Thanks for submitting your review:\n"${userProfile.currentReviewComment}"!\n\n👉 What would you like to do next?\n• 🛍️ Place an order\n• 🗓️ Book a table\n• 👀 See recommendations\n• ❓ Ask for help`
                  : "❌ There was an issue submitting your review. Please try again later.";
                delete userProfile.currentReviewComment;
                delete userProfile.awaitingReviewComment;
                delete userProfile.awaitingReviewConfirmation;
              } else if (text.toLowerCase() === "no") {
                reply = "✏️ Okay! Please provide a new review comment.";
                delete userProfile.currentReviewComment;
              } else {
                reply =
                  '❓ Please respond with "yes" to confirm or "no" to edit your review.';
              }
            }
          } catch (error) {
            console.error("[ReviewRestaurant Error]", error);
            reply =
              "⚠️ An error occurred while submitting your review. Please try again later.";
            delete userProfile.currentReviewComment;
            delete userProfile.awaitingReviewComment;
            delete userProfile.awaitingReviewConfirmation;
          }
          break;
        }

        case "SearchRestaurant": {
          try {
            if (!cuisine && !location && !userProfile.awaitingSearchInput) {
              reply =
                "❓ Please specify a cuisine (e.g., Italian) or location (e.g., New York) for the search.";
              userProfile.awaitingSearchInput = true;
            } else {
              const searchQuery = cuisine || location || text;
              const results = await searchRestaurants(searchQuery);
              if (results && results.length > 0) {
                reply =
                  `🔍 Here are some ${searchQuery}-based restaurants:\n\n` +
                  results
                    .map(
                      (r) =>
                        `• ${r.name} (${r.address})\n🌐 [View Details](${r.link})`
                    )
                    .join("\n\n") +
                  `\n\n👉 Would you like to:\n• 👀 See more results\n• 📋 Get menu for a specific restaurant\n• 🗓️ Book a table?`;
                delete userProfile.awaitingSearchInput;
              } else {
                reply = `🤔 No ${searchQuery}-based restaurants found. Try specifying another cuisine or location.`;
              }
            }
          } catch (error) {
            console.error("[SearchRestaurant Error]", error);
            reply =
              "⚠️ An error occurred while searching for restaurants. Please try again later.";
            delete userProfile.awaitingSearchInput;
          }
          break;
        }

        // Review ==>
        case "RateItem": {
          try {
            if (!mItem && !userProfile.awaitingRatingItem) {
              reply =
                "❓ Please tell me the name of the item you'd like to rate.";
              userProfile.awaitingRatingItem = true;
              break;
            } else if (!ratingValue && userProfile.awaitingRatingItem) {
              reply = `🌟 What rating would you like to give "${userProfile.currentRatingItem}"? (1-5)`;
              break;
            } else {
              const itemToRate = mItem || userProfile.currentRatingItem;
              const rating = parseInt(ratingValue);
              if (!rating || rating < 1 || rating > 5) {
                reply = "❓ Please provide a valid rating between 1 and 5.";
                break;
              } else {
                const success = await rateItem(
                  userProfile.userId,
                  itemToRate,
                  rating
                );
                if (success) {
                  reply = `🌟 Thanks! You rated "${itemToRate}" ${rating}/5.\n\n👉 What would you like to do next?\n• 🍔 Order this item\n• 👀 See recommendations\n• 🗓️ Book a table\n• ❓ Ask for help`;
                } else {
                  reply = `❌ Could not rate "${itemToRate}". It might not exist or be available for review.\n\n👉 What would you like to do next?\n• 🔍 Try another item\n• 👀 See recommendations\n• ❓ Ask for help`;
                }
              }
              delete userProfile.awaitingRatingItem;
              delete userProfile.currentRatingItem;
            }
          } catch (error) {
            console.error("[RateItem Error]", error);
            reply =
              "⚠️ An error occurred while submitting your rating. Please try again later.";
            delete userProfile.awaitingRatingItem;
            delete userProfile.currentRatingItem;
          }
          break;
        }

        default: {
          // This handles unexpected or undefined intents
          if (userProfile.currentState) {
            reply =
              "🤔 It seems I didn't understand your request for this step.\n" +
              "If you're trying to continue an ongoing action, you can:\n" +
              "✅ Try retyping your input.\n" +
              "↩️ Type 'cancel' to abort the current action.\n" +
              "❓ Or ask for help.";
          } else {
            reply =
              "🤔 Sorry, I didn't understand that.\n\n" +
              "Here are a few things you can try:\n" +
              "• 🗓️ Book a table\n" +
              "• 🍔 Place an order\n" +
              "• 📋 View your reservations\n" +
              "• 💳 Make a payment\n" +
              "• ❓ Ask for help\n\n" +
              "👉 Just type one of the options above.";
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
          await context.sendActivity(
            '👋 Welcome to the Restaurant Bot 👋\n\nPlease type:\n\n👉 "login" to sign in\n\n👉 "signup" to register\n'
          );
        }
      }
      await next();
    });
  }
}

module.exports.RestaurantBot = RestaurantBot;
