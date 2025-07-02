-- backend/database/queries.sql

-- Database
CREATE DATABASE restaurant_bot;
USE restaurant_bot;

-- Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255)
);

-- Locations
CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(50),
    area VARCHAR(100)
);

-- Cuisines
CREATE TABLE cuisines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50)
);

-- Restaurants
CREATE TABLE restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location_id INT,
    cuisine_id INT,
    price_range VARCHAR(10),
    rating FLOAT DEFAULT 0,
    accepting_orders TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (cuisine_id) REFERENCES cuisines(id) ON DELETE CASCADE
);

-- Reviews
-- CREATE TABLE reviews (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     user_id INT,
--     restaurant_id INT,
--     rating INT CHECK (rating BETWEEN 1 AND 5),
--     comment TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
--     FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
-- );

-- Menus
CREATE TABLE menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT,
    name VARCHAR(100),
    description TEXT,
    image_path VARCHAR(255),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Menu Items
CREATE TABLE menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT,
    name VARCHAR(100),
    description TEXT,
    price DECIMAL(10, 2),
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
);

-- Item Images
CREATE TABLE item_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT,
    image_url TEXT,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Item Reviews
-- CREATE TABLE item_reviews (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     user_id INT,
--     menu_item_id INT,
--     rating INT CHECK (rating BETWEEN 1 AND 5),
--     comment TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
--     FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
-- );

-- Reservations
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    restaurant_id INT,
    reservation_date DATE,
    reservation_time TIME,
    party_size INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Orders
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    restaurant_id INT,
    order_status ENUM('placed','pending','accepted','on the way','delivered','cancelled') DEFAULT 'placed',
    delivery_method ENUM('delivery', 'takeaway') DEFAULT 'delivery',
    total_amount DECIMAL(10,2),
    order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Order Items
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    menu_item_id INT,
    quantity INT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Payments
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  payment_status VARCHAR(20) NOT NULL, -- "pending", "paid", "cash on delivery", "refunded"
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) NOT NULL, -- "mock", "credit card", "debit card", "netbanking", "upi"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- User Behavior
CREATE TABLE user_behavior (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    restaurant_id INT,
    menu_item_id INT,
    action_type ENUM('view', 'order'),
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);


-- Dummy database for restaurant_bot (testing)
-- Users
INSERT INTO users (name, email, password)
VALUES
  ('eshan', 'eshansud22@gmail.com', '$2b$10$42mZxcEOiOSiCBXmBgVEo.DLy.4oXvYsuHGhUczSRY8AaOvJb4z9G');

-- Locations
INSERT INTO locations (city, area)
VALUES
  ('Jaipur', 'Malviya Nagar'),
  ('Delhi', 'Connaught Place'),
  ('Mumbai', 'Bandra'),
  ('Mumbai', 'Andheri'),
  ('Mumbai', 'Colaba'),
  ('Delhi', 'Saket'),
  ('Delhi', 'Karol Bagh'),
  ('Bangalore', 'Indiranagar'),
  ('Bangalore', 'Koramangala'),
  ('Bangalore', 'Whitefield'),
  ('Hyderabad', 'Banjara Hills'),
  ('Hyderabad', 'Hitech City'),
  ('Chennai', 'T. Nagar'),
  ('Chennai', 'Adyar'),
  ('Kolkata', 'Park Street'),
  ('Kolkata', 'Salt Lake'),
  ('Pune', 'Koregaon Park'),
  ('Pune', 'Hinjewadi'),
  ('Ahmedabad', 'SG Highway'),
  ('Ahmedabad', 'Navrangpura'),
  ('Jaipur', 'C-Scheme'),
  ('Jaipur', 'Vaishali Nagar'),
  ('Chandigarh', 'Sector 17'),
  ('Chandigarh', 'Sector 35'),
  ('Lucknow', 'Hazratganj'),
  ('Lucknow', 'Gomti Nagar'),
  ('Indore', 'Vijay Nagar'),
  ('Indore', 'Palasia'),
  ('Nagpur', 'Dharampeth'),
  ('Nagpur', 'Sitabuldi'),
  ('Goa', 'Panaji'),
  ('Goa', 'Calangute'),
  ('Noida', 'Sector 18'),
  ('Noida', 'Sector 62'),
  ('Gurgaon', 'Cyber City'),
  ('Gurgaon', 'MG Road'),
  ('Surat', 'Adajan'),
  ('Surat', 'Vesu'),
  ('Bhopal', 'MP Nagar'),
  ('Bhubaneswar', 'Jaydev Vihar'),
  ('Thiruvananthapuram', 'Kowdiar'),
  ('Kochi', 'MG Road'),
  ('Mysore', 'VV Mohalla'),
  ('Visakhapatnam', 'Siripuram'),
  ('Patna', 'Boring Road'),
  ('Ranchi', 'Main Road'),
  ('Varanasi', 'Lanka'),
  ('Dehradun', 'Rajpur Road'),
  ('Udaipur', 'Fatehpura'),
  ('Amritsar', 'Ranjit Avenue'),
  ('Kanpur', 'Swaroop Nagar'),
  ('Guwahati', 'GS Road'),
  ('Raipur', 'Telibandha'),
  ('Jodhpur', 'Sardarpura'),
  ('Meerut', 'Shastri Nagar'),
  ('Agra', 'Tajganj'),
  ('Nashik', 'College Road'),
  ('Vijayawada', 'Benz Circle'),
  ('Coimbatore', 'RS Puram'),
  ('Madurai', 'KK Nagar');

-- Cuisines
INSERT INTO cuisines (name)
VALUES
  ('Indian'),
  ('Italian'),
  ('Chinese'),
  ('Japanese'),
  ('Thai'),
  ('Mexican'),
  ('French'),
  ('Greek'),
  ('Spanish'),
  ('Korean'),
  ('Vietnamese'),
  ('Turkish'),
  ('Lebanese'),
  ('Moroccan'),
  ('Ethiopian'),
  ('Brazilian'),
  ('Caribbean'),
  ('German'),
  ('American'),
  ('Cuban'),
  ('Russian'),
  ('Persian'),
  ('Malaysian'),
  ('Indonesian'),
  ('Filipino'),
  ('Pakistani'),
  ('Bangladeshi'),
  ('Nepalese'),
  ('Sri Lankan'),
  ('Afghan'),
  ('Polish'),
  ('Portuguese'),
  ('Hungarian'),
  ('Cajun'),
  ('Creole'),
  ('Peruvian'),
  ('Argentinian'),
  ('Colombian'),
  ('Chilean'),
  ('Israeli'),
  ('Syrian'),
  ('Tibetan'),
  ('Hawaiian'),
  ('South African'),
  ('Nigerian'),
  ('Kenyan'),
  ('Scandinavian'),
  ('Belgian'),
  ('Swiss'),
  ('Austrian'),
  ('Burmese'),
  ('Singaporean'),
  ('Georgian'),
  ('Uzbek'),
  ('Kazakh'),
  ('Algerian'),
  ('Tunisian'),
  ('Sudanese'),
  ('Somali'),
  ('Jamaican'),
  ('Dominican'),
  ('Venezuelan'),
  ('Iraqi'),
  ('Palestinian'),
  ('Balti'),
  ('Fusion'),
  ('Mediterranean'),
  ('Middle Eastern'),
  ('Latin American');

-- Restaurants
INSERT INTO restaurants (name, location_id, cuisine_id, price_range, rating)
VALUES
  ('Pizza Palace', 1, 1, '200-500', 4.5),
  ('Curry Corner', 2, 2, '0-200', 4.0);

-- Menus
INSERT INTO menus (restaurant_id, name, description, image_path)
VALUES
  (1, 'Main Menu', 'Delicious pizzas and pastas', 'images/menu_pizza_palace.jpg'),
  (2, 'Daily Specials', 'Authentic Indian dishes', 'images/menu_pizza_palace.jpg');

-- Menu Items
INSERT INTO menu_items (menu_id, name, description, price)
VALUES
  (1, 'Margherita Pizza', 'Classic pizza with tomato and mozzarella', 299.00),
  (1, 'Penne Alfredo', 'Creamy pasta with mushrooms', 349.00),
  (2, 'Paneer Butter Masala', 'Cottage cheese in creamy tomato gravy', 199.00),
  (2, 'Garlic Naan', 'Leavened bread with garlic topping', 49.00);

-- Item Images
INSERT INTO item_images (menu_item_id, image_url)
VALUES
  (1, 'margherita.jpg'),
  (2, 'alfredo.jpg');

-- Reviews
-- INSERT INTO reviews (user_id, restaurant_id, rating, comment)
-- VALUES
--   (1, 1, 5, 'Amazing pizza!'),
--   (2, 2, 4, 'Good food, but service was slow');

-- Item Reviews
-- INSERT INTO item_reviews (user_id, menu_item_id, rating, comment)
-- VALUES
--   (1, 1, 5, 'Perfectly cheesy!'),
--   (2, 3, 4, 'Spicy and flavorful');

-- Reservations
INSERT INTO reservations (user_id, restaurant_id, reservation_date, reservation_time, party_size, notes)
VALUES
  (1, 1, '2025-06-10', '19:30:00', 2, 'Window seat preferred');

-- Orders
INSERT INTO orders (user_id, restaurant_id, order_status, total_amount)
VALUES
  (1, 2, 'delivered', 248.00);

-- Order Items
INSERT INTO order_items (order_id, menu_item_id, quantity)
VALUES
  (2, 3, 1),
  (2, 4, 1);

-- User Behaviour
INSERT INTO user_behavior (user_id, restaurant_id, menu_item_id, action_type)
VALUES
  (1, 1, 1, 'view'),
  (1, 2, 3, 'order');