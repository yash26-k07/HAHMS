-- ============================================================
-- Meridian Health — Hospital & Healthcare Management System
-- PostgreSQL Database Schema
-- ============================================================

-- Run:  psql -U postgres -f database/schema.sql
-- This script drops and recreates the meridian_health database.

DROP DATABASE IF EXISTS meridian_health;
CREATE DATABASE meridian_health;

-- Connect to the database before running the rest:
\c meridian_health

-- ------------------------------------------------------------
-- Helper: auto-update "updated_at" trigger function
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- USERS  (accounts + role-based access)
-- ------------------------------------------------------------
CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','doctor','receptionist','patient')),
    phone         VARCHAR(20),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- DEPARTMENTS
-- ------------------------------------------------------------
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL UNIQUE,
    description   TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PATIENTS  (profile linked 1:1 to a user account)
-- ------------------------------------------------------------
CREATE TABLE patients (
    patient_id   SERIAL PRIMARY KEY,
    user_id      INT UNIQUE,                       -- nullable: staff can register walk-in patients w/o login
    name         VARCHAR(120) NOT NULL,
    age          INT CHECK (age >= 0 AND age <= 130),
    gender       VARCHAR(10) NOT NULL CHECK (gender IN ('male','female','other')),
    contact      VARCHAR(20) NOT NULL,
    email        VARCHAR(160),
    address      VARCHAR(255),
    blood_group  VARCHAR(5),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- DOCTORS  (profile linked 1:1 to a user account)
-- ------------------------------------------------------------
CREATE TABLE doctors (
    doctor_id      SERIAL PRIMARY KEY,
    user_id        INT UNIQUE NOT NULL,
    name           VARCHAR(120) NOT NULL,
    department_id  INT NOT NULL,
    specialization VARCHAR(120),
    availability   VARCHAR(255),                   -- e.g. "Mon-Fri 9:00-17:00"
    consultation_fee DECIMAL(10,2) DEFAULT 0,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- APPOINTMENTS
-- ------------------------------------------------------------
CREATE TABLE appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id     INT NOT NULL,
    doctor_id      INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
    reason         VARCHAR(255),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    -- Prevents the same doctor being double-booked at the same date/time
    UNIQUE (doctor_id, appointment_date, appointment_time)
);

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- ADMISSIONS  (basic bed / ward tracking)
-- ------------------------------------------------------------
CREATE TABLE admissions (
    admission_id   SERIAL PRIMARY KEY,
    patient_id     INT NOT NULL,
    ward           VARCHAR(60) NOT NULL,
    bed_number     VARCHAR(20) NOT NULL,
    admission_date TIMESTAMP NOT NULL,
    discharge_date TIMESTAMP NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'admitted'
                   CHECK (status IN ('admitted','discharged')),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- MEDICAL RECORDS  (one per appointment / visit)
-- ------------------------------------------------------------
CREATE TABLE medical_records (
    record_id      SERIAL PRIMARY KEY,
    patient_id     INT NOT NULL,
    doctor_id      INT NOT NULL,
    appointment_id INT UNIQUE,
    visit_date     DATE NOT NULL,
    diagnosis      TEXT,
    notes          TEXT,
    follow_up_date DATE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- PRESCRIPTIONS  (belong to a medical record)
-- ------------------------------------------------------------
CREATE TABLE prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    record_id       INT NOT NULL,
    medicine        VARCHAR(120) NOT NULL,
    dosage          VARCHAR(60) NOT NULL,
    duration        VARCHAR(60),
    instructions    VARCHAR(255),
    FOREIGN KEY (record_id) REFERENCES medical_records(record_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- INVOICES  (billing)
-- ------------------------------------------------------------
CREATE TABLE invoices (
    invoice_id     SERIAL PRIMARY KEY,
    patient_id     INT NOT NULL,
    appointment_id INT NULL,
    total_amount   DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','partially_paid','paid')),
    issued_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
);

CREATE TABLE invoice_items (
    item_id     SERIAL PRIMARY KEY,
    invoice_id  INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price  DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- PAYMENTS  (one or more entries per invoice)
-- ------------------------------------------------------------
CREATE TABLE payments (
    payment_id     SERIAL PRIMARY KEY,
    invoice_id     INT NOT NULL,
    amount         DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_date   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
                   CHECK (payment_method IN ('cash','card','upi','insurance')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- INVENTORY  (medicines & consumables)
-- ------------------------------------------------------------
CREATE TABLE inventory (
    item_id      SERIAL PRIMARY KEY,
    name         VARCHAR(120) NOT NULL,
    category     VARCHAR(60),
    quantity     INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit         VARCHAR(30) DEFAULT 'units',
    reorder_level INT DEFAULT 10,
    expiry_date  DATE,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- INDEXES for common lookups
-- ------------------------------------------------------------
CREATE INDEX idx_appt_patient ON appointments(patient_id);
CREATE INDEX idx_appt_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_records_patient ON medical_records(patient_id);
CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_inventory_expiry ON inventory(expiry_date);

-- ------------------------------------------------------------
-- SEED DATA
-- ------------------------------------------------------------
INSERT INTO departments (name, description) VALUES
('Cardiology', 'Heart and cardiovascular care'),
('Emergency & Trauma', '24/7 emergency response'),
('Outpatient Care', 'General consultations'),
('Pharmacy', 'Medicine dispensing and inventory'),
('Diagnostics & Labs', 'Testing and imaging');

-- password_hash values below are bcrypt hashes of "password123" (generate real ones at signup)
INSERT INTO users (name, email, password_hash, role, phone) VALUES
('Admin User', 'admin@meridian.health', '$2b$10$replace.with.real.bcrypt.hash', 'admin', '9990000001'),
('Dr. Asha Rao', 'asha.rao@meridian.health', '$2b$10$replace.with.real.bcrypt.hash', 'doctor', '9990000002'),
('Reception Desk', 'reception@meridian.health', '$2b$10$replace.with.real.bcrypt.hash', 'receptionist', '9990000003'),
('Rahul Mehta', 'rahul.mehta@example.com', '$2b$10$replace.with.real.bcrypt.hash', 'patient', '9990000004');

INSERT INTO doctors (user_id, name, department_id, specialization, availability, consultation_fee) VALUES
(2, 'Dr. Asha Rao', 1, 'Cardiologist', 'Mon-Fri 09:00-17:00', 800.00);

INSERT INTO patients (user_id, name, age, gender, contact, email, address, blood_group) VALUES
(4, 'Rahul Mehta', 34, 'male', '9990000004', 'rahul.mehta@example.com', '221B, Sector 12', 'O+');

INSERT INTO inventory (name, category, quantity, unit, reorder_level, expiry_date) VALUES
('Paracetamol 500mg', 'Medicine', 500, 'tablets', 50, '2027-06-30'),
('Surgical Gloves', 'Consumable', 200, 'pairs', 30, NULL),
('Insulin Vial', 'Medicine', 40, 'vials', 10, '2027-01-15');
