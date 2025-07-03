# DineBot

My project for the completion of my Node.js internship at Celebal Technologies 2025

- Website is live on : [link](https://purple-hill-0150e1600.2.azurestaticapps.net/)

> **Note:** Backend may not work because it is on **free** tier & only runs for 60 compute minutes/day.


---

#### Sample Images (of the frontend:

<img src="https://github.com/user-attachments/assets/37128736-7ee8-4917-a936-1212f63cbd5e" width="300" height="auto" /> 
<img src="https://github.com/user-attachments/assets/27d93449-7743-419e-a6df-33b0653c3678" width="300" height="auto" />

<br/>

<img src="https://github.com/user-attachments/assets/d1ff4384-ccbc-471f-8051-a09132d0b665" width="300" height="auto" />
<img src="https://github.com/user-attachments/assets/872e6b68-e13f-43a9-9e05-839cb5f5c020" width="300" height="auto" />

---


### Instructions received for the project:

This handy restaurant bot simplifies your dining experience. It helps you find restaurants, browse menus, make reservations, and even place orders for delivery or pickup, all within a user-friendly chat interface.

- Restaurant Discovery: Search for restaurants by cuisine, location, price range, or specific keywords.
- Menu Exploration: Access digital menus with clear descriptions, pictures, and customer reviews.
- Reservation Management: Make reservations for your desired date and time, specifying any special requests.
- Ordering Made Easy: Place orders for delivery or pickup directly through the bot, adding or removing items with ease.
- Payment Integration: Securely pay for your order using a connected payment method within the chat interface.
- Order Tracking: Receive real-time updates on the status of your order, from confirmation to delivery (or pickup notification).
- Table Management: Manage your reservations and orders in one place, allowing for easy cancellations or modifications.
- Personalized Recommendations: Based on your past choices and preferences, the bot can suggest relevant restaurants and dishes.


### Start the Project:

- Create `.env` in both frontend & backend workspaces

- After adding all the required details in the `.env` files

  - Backend :

        DB_HOST=db_host_name
        DB_USER=db_user_name
        DB_PASSWORD=_db_password
        DB_NAME=db_name
        DB_PORT=db_port_number
        BACKEND_PORT=port_number
        BASE_URL=backend_base_url
        JWT_SECRET=jwt_secret
        JWT_REFRESH_SECRET=jwt_refresh_secret
        AZURE_CLU_KEY=azure_clu_key
        AZURE_CLU_PROJECT_NAME=azure_clu_project_name
        AZURE_CLU_DEPLOYMENT_NAME=azure_clu_project_deployment_name
        AZURE_CLU_ENDPOINT=azure_clu_endpoint

  - Frontend :

        REACT_APP_AZURE_BACKEND_API=your_backend_api

- Run these on the terminal in the root directory of the project:

      npm install
      npm run dev:all


### Technologies Used:

- Node.js
- Express.js
- React.js
- MySQL
- Microsoft Azure (conversation language understanding)
- REST APIs
- Microsoft Bot Emulator
- Postman (testing APIs)


#### Other Dependencies:

- Backend

  - azure/ai-language-conversations
  - bcrypt
  - body-parser
  - botbuilder
  - cookie-parser
  - cors
  - dotenv
  - express
  - express-rate-limit
  - express-slow-down
  - jsonwebtoken
  - mysql2
  - nodemon (dev dependency)

- Frontend
  - @testing-library/dom
  - @testing-library/jest-dom
  - @testing-library/react
  - @testing-library/user-event
  - lucide-react
  - react
  - react-dom
  - react-router-dom
  - react-scripts
  - web-vitals


### TODO

- [x] Core Setup & Tools

  - [x] Install JavaScript dependencies (express, cors, botbuilder, bcrypt, nodemon)
  - [x] Set up Bot Framework Emulator for local testing
  - [x] Configure MySQL Database
  - [x] Initialise Node.js Project
  - [x] Connect Node.js to MySQL (using mysql2)
  - [x] Basic User Authentication
  - [x] User Auth using Bot
  - [x] Persistent User Profile for each unique session
  - [x] Make the bot conversationally stateful (creating a bias b/w each conversation thread from the intial indentified intent)
    <!-- TODO-FUTURE - [] Add buttons instead of purely text-based -->
    <!-- TODO-FUTURE - [] Add extra qualifying text to intents with multiple paths (EditCart, ModifyReservation, RemoveFromCart, CheckPaymentStatus) -->

- [x] Model Training

  - [x] Setup Azure CLU service
  - [x] Implement intents, entities, & training utterances
  - [x] Train CLU model
  - [x] Deploy CLU service
  - [x] Integrate CLU service to bot

- [x] Backend

  - [x] Basic Security

    - [x] Hashing & Salting
    - [x] Rate Limiting
    - [x] Delay spamming queries
    - [x] Use parametrised SQL queries
    - [x] Implement Intents
      - [x] None (or FallbackIntent)
      - [x] GeneralGreeting

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
        <!-- TODO-FUTURE - [] AddRecommendedItem -->
          <!-- => Track additions from AddRecommendedItem in userBehavior -->

  <!-- TODO-FUTURE - [] Ratings -->
    <!-- TODO-FUTURE - [] Implement Relations (item_reviews) -->
    <!-- TODO-FUTURE - [] RateItem -->
    <!-- TODO-FUTURE - [] ReviewRestaurant -->

  <!-- TODO-FUTURE - [] ProvideFeedback -->

  <!-- TODO-FUTURE - [] ManageCoupons -->
    <!-- TODO-FUTURE - [] ViewCoupons -->
    <!-- TODO-FUTURE - [] ApplyCoupon -->

- [x] Frontend

  - [x] Home: Home page of the application
  - [x] NotFound: Fallack for undefined addresses
  - [x] RestaurantBotCard: Selection of restaurant chatbot on home page
  - [x] ChatHeader: Bot name, status indicator
  - [x] ChatBubbles: Bubbles from either side's messages
  - [x] ChatWindow: Chat container for messaging UI.
    - [x] Implement up & down arrows to cycle through messages
  - [x] Refresh Token funcitonality
    <!-- TODO-FUTURE - [] RestaurantList: Displays list of restaurants (name, rating, cuisine, price range) -->
    <!-- TODO-FUTURE - [] RestaurantCard: Individual restaurant item with basic info and thumbnail -->
    <!-- TODO-FUTURE - [] LocationFilter: Filter restaurants by city/area -->
    <!-- TODO-FUTURE - [] CuisineFilter: Filter restaurants by cuisine types -->
    <!-- TODO-FUTURE - [] RestaurantDetails: Detailed info page/modal for a selected restaurant address, reviews, menu link) -->
    <!-- TODO-FUTURE - [] MenuList: -->
    <!-- TODO-FUTURE - [] MenuItemCard: -->

<!-- TODO-FUTURE- [] Write tests -->

- [x] Deployment

  - [x] Deploy CLU service to Azure Language Services
  - [x] Deploy the bot to Azure Bot Services
  - [x] Deploy frontend on Azure
  - [x] Deploy backend on Azure
  - [x] Deploy MySQL databse on Azure MySQL Flexible Server
  - [x] Set up CD (Continuous Deployment) on Azure
  - [x] Integrate them together
