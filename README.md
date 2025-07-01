# Restaurant Bot

My project for the completion of my Node.js internship at Celebal Technologies 2025

### Start the backend:

- Run this on the terminal in the root directory of the project

  npm run dev:backend

### Technologies being used:

- Node.js
- MySQL
- Microsoft Azure (conversation language understanding)
- REST APIs
- Microsoft Bot Emulator
- Postman (testing APIs)

#### Other dependencies:

- azure/ai-language-conversations
- bcrypt
- body-parser
- botbuilder
- chrono-node
- cors
- dotenv
- express
- jsonwebtoken
- mysql2
- nodemon (dev dependency)

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
  - [x] Configure MySQL Database
  - [x] Initialise Node.js Project
  - [x] Connect Node.js to MySQL (using mysql2)
  - [x] Basic User Authentication
  - [x] Setup Azure CLU service
  - [x] Implement intents, entities, & training utterances
  - [x] Train CLU model
  - [x] Deploy CLU service
  - [x] Integrate CLU service to bot
  - [x] User Auth using Bot
  - [x] Persistent User Profile for each unique session
  - [x] Implement Intents
    - [x] None (or FallbackIntent)
    - [x] GeneralGreeting
  - [x] Make the bot conversationally stateful (creating a sort of bias b/w each conversation thread from the intially indentified intent)

- [x] Restaurant

  - [x] Design MySQL relations (restaurants, locations, cuisines, reviews)
  - [x] Implement basic restraunt discovery using user inputs
  - [x] Implement all restraunt discovery (eg, "Show all restaurants")
  - [x] Implement location based discovery using user input (eg, "Chinese food near me")
  - [x] Restaurant search based on
    - [x] Restaurant Name
    - [x] Cuisine
    - [x] Location or City
    - [x] Price range
    - [x] Rating
  - [x] Implement Intents
    - [x] SearchRestaurant

- [x] Menu

  - [x] Create MySQL relations (menus, menu_items, item_images, item_reviews)
  - [x] Display Menu description, image, price, user ratings
  - [x] Implement Intents
    - [x] ShowMenu

- [x] Reservation

  - [x] Create MySQL relation (reservation)
  - [x] Implement Intents
    - [x] MakeReservation
    - [x] CancelReservation
    - [x] ModifyReservation
    - [x] ShowReservations

- [x] Orders

  - [x] Create MySQL relation (orders)
  - [x] Implement Intents
    - [x] CancelOrder
    - [x] CheckOrderStatus

- [x] Cart

  - [x] Implement memory for conversation
  - [x] Implement Intents
    - [x] AddToCart
    - [x] RemoveFromCart
    - [x] ViewCart
    - [x] EditCart
    - [x] ClearCart
    <!-- TODO-FUTURE - [] Store pending cart in Database (order status as 'pending') -->

- [x] Payment

  - [x] Implement MySQL relation (payments)
  - [x] Implement Intents
    - [x] CheckPaymentStatus
    - [x] PayOrder

- [x] Recommendations

  - [x] Implement MySQL relation (user_behavior)
  - [x] Track user's behavior
    - [x] Menus viewed
    - [x] Ordered items
      <!-- TODO FUTURE - [] Restaurants viewed -->
      <!-- TODO-FUTURE - [] Based on ratings -->
      <!-- TODO-FUTURE - [] Based on user reviews -->
  - [x] Rule-based recommendation
  - [x] Implement Intents
    - [x] RecommendItem

- [] Deployment

  - [x] Deploy CLU service to Azure Language Services
  - [] Deploy the bot to Azure Bot Services
  - [] Connect bot to Microsoft Teams or Web Chat Channel

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
