import sqlite3
import random
from datetime import datetime, timedelta
import os

# Configuration
DB_PATH = r"..\database\fraud_platform.db"
SCHEMA_PATH = r"..\database\schema.sql"

CUSTOMER_COUNT = 50
VENDOR_COUNT = 20
TRANSACTION_COUNT = 10000

# Metadata for generation
LOCATIONS = ['New York', 'London', 'Singapore', 'Tokyo', 'San Francisco', 'Berlin', 'Mumbai', 'Sydney']
VENDOR_CATEGORIES = ['Retail', 'Electronics', 'Consulting', 'Travel', 'Software', 'Logistics']
NAMES_FIRST = ['John', 'Jane', 'Robert', 'Alice', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma']
NAMES_LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']

def create_connection():
    """Create a database connection to the SQLite database."""
    conn = None
    try:
        # Ensure database directory exists
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        print(f"Connected to SQLite: {DB_PATH}")
    except Exception as e:
        print(f"Error connecting to DB: {e}")
    return conn

def init_db(conn):
    """Initialize the database tables."""
    try:
        with open(SCHEMA_PATH, 'r') as f:
            schema_script = f.read()
        cursor = conn.cursor()
        cursor.executescript(schema_script)
        print("Database schema initialized successfully.")
    except Exception as e:
        print(f"Error initializing schema: {e}")

def generate_customers(conn):
    cursor = conn.cursor()
    print(f"Generating {CUSTOMER_COUNT} customers...")
    customers = []
    for i in range(1, CUSTOMER_COUNT + 1):
        name = f"{random.choice(NAMES_FIRST)} {random.choice(NAMES_LAST)}"
        age = random.randint(22, 65)
        loc = random.choice(LOCATIONS)
        avg_val = round(random.uniform(50, 2000), 2)
        customers.append((i, name, age, loc, avg_val))
    
    cursor.executemany("INSERT OR IGNORE INTO customers VALUES (?, ?, ?, ?, ?)", customers)
    conn.commit()

def generate_vendors(conn):
    cursor = conn.cursor()
    print(f"Generating {VENDOR_COUNT} vendors...")
    vendors = []
    for i in range(1, VENDOR_COUNT + 1):
        name = f"Vendor_{random.choice(VENDOR_CATEGORIES)}_{i}"
        cat = random.choice(VENDOR_CATEGORIES)
        risk = round(random.uniform(0, 0.5), 2) # Vendors start with random base risk
        vendors.append((i, name, cat, risk))
    
    cursor.executemany("INSERT OR IGNORE INTO vendors VALUES (?, ?, ?, ?)", vendors)
    conn.commit()

def generate_transactions(conn):
    cursor = conn.cursor()
    print(f"Generating {TRANSACTION_COUNT} transactions (this may take a moment)...")
    
    transactions = []
    start_date = datetime.now() - timedelta(days=90) # Last 90 days data
    
    for _ in range(TRANSACTION_COUNT):
        c_id = random.randint(1, CUSTOMER_COUNT)
        v_id = random.randint(1, VENDOR_COUNT)
        
        # Logic to make some transactions "Normal" and some "Suspicious"
        is_suspicious = random.random() < 0.05 # 5% naturally suspicious data locally
        
        base_amount = random.uniform(10, 500)
        if is_suspicious:
            amount = base_amount * random.uniform(5, 20) # High amount outlier
        else:
            amount = base_amount
            
        timestamp = start_date + timedelta(minutes=random.randint(0, 90*24*60))
        
        # Location anomaly
        if random.random() < 0.02:
             loc = "Unknown_Location"
        else:
             loc = random.choice(LOCATIONS)
             
        status = "completed"
        
        transactions.append((c_id, v_id, round(amount, 2), timestamp, loc, status))
        
    cursor.executemany("""
        INSERT INTO transactions (customer_id, vendor_id, amount, timestamp, location, status) 
        VALUES (?, ?, ?, ?, ?, ?)
    """, transactions)
    conn.commit()
    print("Transactions generated.")

def main():
    conn = create_connection()
    if conn:
        init_db(conn)
        
        # Check if data already exists to avoid duplication on re-runs
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) FROM transactions")
        count = cursor.fetchone()[0]
        
        if count == 0:
            generate_customers(conn)
            generate_vendors(conn)
            generate_transactions(conn)
            print("Data Generation Complete.")
        else:
            print(f"Database already contains {count} transactions. Skipping generation.")
            
        conn.close()

if __name__ == "__main__":
    main()
