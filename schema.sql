-- ============================================================
-- ParcelGo - Smart Crowd-Based Parcel Delivery System
-- Database Schema (MySQL)
-- ============================================================

CREATE DATABASE IF NOT EXISTS parcelgo_db;
USE parcelgo_db;

-- USERS TABLE
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(100),
  role ENUM('sender','traveler','both') DEFAULT 'both',
  rating DECIMAL(2,1) DEFAULT 5.0,
  total_ratings INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  profile_pic VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OTP TABLE
CREATE TABLE otp_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  purpose ENUM('login','register','delivery_confirm') DEFAULT 'login',
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mobile (mobile),
  INDEX idx_expires (expires_at)
);

-- PARCELS TABLE
CREATE TABLE parcels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_id VARCHAR(20) NOT NULL UNIQUE,
  sender_id INT NOT NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  drop_address TEXT NOT NULL,
  drop_lat DECIMAL(10,8),
  drop_lng DECIMAL(11,8),
  weight DECIMAL(8,2) NOT NULL,
  size ENUM('small','medium','large','bulk') NOT NULL,
  parcel_type ENUM('general','fragile','perishable','documents','electronics') DEFAULT 'general',
  recommended_vehicle ENUM('bike','car','van','truck') NOT NULL,
  description TEXT,
  status ENUM('pending','matched','in_transit','out_for_delivery','delivered','cancelled') DEFAULT 'pending',
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  delivery_otp VARCHAR(6),
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- TRAVELER TRIPS TABLE
CREATE TABLE trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  traveler_id INT NOT NULL,
  from_address TEXT NOT NULL,
  from_lat DECIMAL(10,8),
  from_lng DECIMAL(11,8),
  to_address TEXT NOT NULL,
  to_lat DECIMAL(10,8),
  to_lng DECIMAL(11,8),
  vehicle_type ENUM('bike','car','van','truck') NOT NULL,
  vehicle_number VARCHAR(20),
  available_capacity DECIMAL(8,2),
  departure_time DATETIME NOT NULL,
  status ENUM('active','full','completed','cancelled') DEFAULT 'active',
  max_parcels INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (traveler_id) REFERENCES users(id)
);

-- DELIVERY ASSIGNMENTS TABLE
CREATE TABLE delivery_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parcel_id INT NOT NULL,
  trip_id INT NOT NULL,
  traveler_id INT NOT NULL,
  sender_id INT NOT NULL,
  match_score DECIMAL(5,2),
  agreed_price DECIMAL(10,2),
  pickup_confirmed_at TIMESTAMP NULL,
  delivery_confirmed_at TIMESTAMP NULL,
  status ENUM('pending','accepted','picked_up','delivered','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parcel_id) REFERENCES parcels(id),
  FOREIGN KEY (trip_id) REFERENCES trips(id),
  FOREIGN KEY (traveler_id) REFERENCES users(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- TRACKING EVENTS TABLE
CREATE TABLE tracking_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parcel_id INT NOT NULL,
  event_type ENUM('booked','matched','picked_up','in_transit','out_for_delivery','delivered','cancelled') NOT NULL,
  description TEXT,
  location_address TEXT,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parcel_id) REFERENCES parcels(id)
);

-- RATINGS TABLE
CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  rated_by INT NOT NULL,
  rated_user INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES delivery_assignments(id),
  FOREIGN KEY (rated_by) REFERENCES users(id),
  FOREIGN KEY (rated_user) REFERENCES users(id)
);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('parcel','trip','payment','system') DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_parcels_status ON parcels(status);
CREATE INDEX idx_parcels_sender ON parcels(sender_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_traveler ON trips(traveler_id);
CREATE INDEX idx_assignments_parcel ON delivery_assignments(parcel_id);
CREATE INDEX idx_tracking_parcel ON tracking_events(parcel_id);
