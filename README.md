# Restaurant Bot

My final project for my internship at Celebal Technologies 2025.

### Start the backend:

- Run this on the terminal in the root directory of the project

  npm run dev:backend

### Technologies being used:

- Node.js
- MySQL
- Microsoft Azure (Conversation Language Understanding)
- REST APIs
- Postman (testing APIs)

#### Other dependencies:

- bcrypt
- body-parser
- botbuilder
- chrono-node
- cors
- dotenv
- express
- jsonwebtoken
- mysql2
- nodemon (dev)

### Instructions:

This handy restaurant bot simplifies your dining experience. It helps you find restaurants, browse menus, make reservations, and even place orders for delivery or pickup, all within a user-friendly chat interface.

- Restaurant Discovery: Search for restaurants by cuisine, location, price range, or specific keywords.
- Menu Exploration: Access digital menus with clear descriptions, pictures, and customer reviews.
- Reservation Management: Make reservations for your desired date and time, specifying any special requests.
- Ordering Made Easy: Place orders for delivery or pickup directly through the bot, adding or removing items with ease.
- Payment Integration: Securely pay for your order using a connected payment method within the chat interface.
- Order Tracking: Receive real-time updates on the status of your order, from confirmation to delivery (or pickup notification).
- Table Management: Manage your reservations and orders in one place, allowing for easy cancellations or modifications.
- Personalized Recommendations: Based on your past choices and preferences, the bot can suggest relevant restaurants and dishes.

### TODO

- [x] Core Setup & Tools

  - [x] Install JavaScript dependencies (express, cors, botbuilder, bcrypt, nodemon)
  - [x] Set up Bot Framework Emulator for local testing
  - [x] Initialise Node.js Project
  - [x] Configure MySQL Database
  - [x] Connect Node.js to MySQL (using mysql2)
  - [x] Basic User Authentication
  - [x] Setup Azure CLU service
  - [x] Integrat Azure CLU service to bot

- [] Restaurant Discovery

  - [x] Design MySQL relations (restaurants, locations, cuisines, reviews, etc).
  - [x] Implement basic restraunt discovery using user inputs
  - [] Implement search intent using user input (eg, "Chinese food near me").
  - [] Query MySQL based on cuisine, location, price range, or keywords.
  - [] Return restaurant options formatted as adaptive cards in chat.

- [] Menu Exploration

  - [x] Create MySQL relations (menus, menu_items, item_images, item_reviews).
  - [x] Implement dialog to show menu for selected restaurant.
  - [] Show item details: description, image, price, user ratings.

- [] Reservation Management

  - [x] Create MySQL reservations relation (user ID, date, time, party size, notes).
  - [] Add dialogs to handle making a reservation (with validation for time slots).
  - [] Allow user to modify or cancel existing reservations.

- [] Ordering System

  - [] Build ordering flow: Add/remove menu items to a cart.
  - [x] Create orders and order_items tables.
  - [] Support pickup vs. delivery options.
  - [] Enable order summary and final confirmation step.

- [] Payment Integration

  - [] Integrate with dummy/test payment gateway (eg, Stripe test mode).
  - [] Capture payment info securely (tokenized method).
  - [] Link payments to specific order IDs.

- [] Order Tracking

  - [] Create order status tracking system (status: pending, accepted, on the way, delivered).
  - [] Send real-time status updates to user via the bot.
  - [] Allow user to view current order status anytime.

- [] Table Management (Reservations + Orders)

  - [] Add dashboard intent for user to view current & past orders/reservations.
  - [] Enable easy cancellations/modifications through dialog options.

- [] Personalized Recommendations

  - [] Track user behavior: restaurant visits, ordered items, ratings.
  - [] Store user preferences in a user_preferences table.
  - [] Recommend dishes/restaurants based on past behavior using basic rules or ML model (optional).

- [] Deployment & Final Touches

  - [] Deploy the bot to Azure Bot Services.
  - [] Connect bot to Microsoft Teams or Web Chat Channel.
  - [] Write documentation for code, database schema, and deployment.
  - [] Test all major scenarios and handle edge cases (invalid input, DB down, etc).

<!-- - [] Complete Frontend

  - [] ChatWindow: Main chat container using Bot Framework Web Chat SDK for messaging UI.
  - [] ChatHeader: Bot name, status indicator, and possibly a user profile button.
  - [] RestaurantList: Displays list of restaurants (name, rating, cuisine, price range)
  - [] RestaurantCard: Individual restaurant item with basic info and thumbnail.
  - [] LocationFilter: Filter restaurants by city/area.
  - [] CuisineFilter: Filter restaurants by cuisine types.
  - [] RestaurantDetails: Detailed info page/modal for a selected restaurant (address, reviews, menu link).
  - [] MenuList:
  - [] MenuItemCard: -->
