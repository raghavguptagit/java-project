-- SocietySync Flyway V1 Initial MySQL 8 Schema
CREATE TABLE societies (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL,
  state VARCHAR(80) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  contact_email VARCHAR(160) NOT NULL,
  contact_phone VARCHAR(32),
  late_fee_amount DECIMAL(12,2) NOT NULL DEFAULT 250.00,
  allow_partial_payments BOOLEAN NOT NULL DEFAULT TRUE,
  allow_overpayment BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE buildings (
  id CHAR(36) PRIMARY KEY,
  society_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(24) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_buildings_society FOREIGN KEY (society_id) REFERENCES societies(id),
  UNIQUE KEY uq_building_code (society_id, code)
);

CREATE TABLE flats (
  id CHAR(36) PRIMARY KEY,
  society_id CHAR(36) NOT NULL,
  building_id CHAR(36) NOT NULL,
  floor_number INT NOT NULL,
  unit_number VARCHAR(32) NOT NULL,
  flat_type VARCHAR(32) NOT NULL,
  area_sqft INT NOT NULL,
  occupancy_status ENUM('OCCUPIED','VACANT','UNDER_MAINTENANCE') NOT NULL DEFAULT 'VACANT',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_flats_society FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_flats_building FOREIGN KEY (building_id) REFERENCES buildings(id),
  UNIQUE KEY uq_flat_unit (society_id, building_id, unit_number)
);

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(32),
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE society_memberships (
  id CHAR(36) PRIMARY KEY,
  society_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  flat_id CHAR(36) NULL,
  role ENUM('PLATFORM_ADMIN','SOCIETY_ADMIN','COMMITTEE_MEMBER','RESIDENT','SECURITY','MAINTENANCE_STAFF') NOT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mem_society FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_mem_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_mem_flat FOREIGN KEY (flat_id) REFERENCES flats(id),
  UNIQUE KEY uq_society_user (society_id, user_id)
);

CREATE TABLE bills (
  id CHAR(36) PRIMARY KEY,
  society_id CHAR(36) NOT NULL,
  flat_id CHAR(36) NOT NULL,
  bill_number VARCHAR(64) NOT NULL,
  billing_period VARCHAR(64) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  late_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED') NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bills_society FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_bills_flat FOREIGN KEY (flat_id) REFERENCES flats(id),
  UNIQUE KEY uq_bill_number (society_id, bill_number)
);

CREATE TABLE payments (
  id CHAR(36) PRIMARY KEY,
  society_id CHAR(36) NOT NULL,
  bill_id CHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method ENUM('UPI','BANK_TRANSFER','CHEQUE','CASH') NOT NULL,
  transaction_reference VARCHAR(120) NOT NULL,
  status ENUM('PENDING_VERIFICATION','VERIFIED','REJECTED') NOT NULL,
  receipt_number VARCHAR(64) NULL,
  idempotency_key VARCHAR(120) NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  CONSTRAINT fk_pay_society FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_pay_bill FOREIGN KEY (bill_id) REFERENCES bills(id),
  UNIQUE KEY uq_pay_idempotency (society_id, idempotency_key)
);

CREATE TABLE complaints (
  id CHAR(36) PRIMARY KEY,
  society_id CHAR(36) NOT NULL,
  ticket_number VARCHAR(40) NOT NULL,
  flat_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  category VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL,
  status ENUM('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','REOPENED') NOT NULL,
  assigned_staff_id CHAR(36) NULL,
  sla_due_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_cmp_society FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_cmp_flat FOREIGN KEY (flat_id) REFERENCES flats(id),
  UNIQUE KEY uq_ticket_number (society_id, ticket_number)
);

CREATE TABLE bookings (
  id CHAR(36) PRIMARY KEY,
  society_id CHAR(36) NOT NULL,
  facility_id CHAR(36) NOT NULL,
  flat_id CHAR(36) NOT NULL,
  booked_by CHAR(36) NOT NULL,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  attendee_count INT NOT NULL DEFAULT 1,
  fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('REQUESTED','CONFIRMED','REJECTED','CANCELLED','COMPLETED') NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking_slot (society_id, facility_id, start_at, end_at)
);

CREATE TABLE audit_logs (
  id CHAR(36) PRIMARY KEY,
  society_id CHAR(36) NULL,
  actor_id CHAR(36) NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_society_time (society_id, created_at)
);
