-- Database Schema for Enterprise Fraud Platform

-- 1. Customers Table (The entities making payments)
CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    location TEXT,
    avg_transaction_val REAL
);

-- 2. Vendors Table (The entities receiving payments)
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    risk_rating REAL -- Baseline risk (0-1)
);

-- 3. Transactions Table (The raw data stream)
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    vendor_id INTEGER,
    amount REAL,
    timestamp DATETIME,
    location TEXT,
    status TEXT, -- 'completed', 'failed', 'pending'
    FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY(vendor_id) REFERENCES vendors(vendor_id)
);

-- 4. Risk Results Table (The Intelligence Output)
-- This table is populated by the Python Risk Engine
CREATE TABLE IF NOT EXISTS risk_results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER,
    risk_score REAL, -- 0 to 100
    risk_level TEXT, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    reason TEXT, -- e.g. "Amount > 3x Average"
    fraud_probability REAL, -- ML Model output 0.0-1.0
    is_reviewed BOOLEAN DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(transaction_id) REFERENCES transactions(transaction_id)
);
