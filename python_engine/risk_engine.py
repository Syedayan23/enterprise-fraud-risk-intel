import sqlite3
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from datetime import datetime
import os

# Configuration
DB_PATH = r"..\database\fraud_platform.db"

def create_connection():
    try:
        conn = sqlite3.connect(DB_PATH)
        return conn
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return None

def fetch_data(conn):
    print("Fetching transaction data...")
    # Load transactions into a Pandas DataFrame
    df = pd.read_sql_query("SELECT * FROM transactions", conn)
    return df

def calculate_profiles(df):
    print("Calculating customer profiles (baselines)...")
    # Average amount per customer
    customer_profiles = df.groupby('customer_id')['amount'].agg(['mean', 'std', 'count']).reset_index()
    customer_profiles.columns = ['customer_id', 'avg_amount', 'std_amount', 'tx_count']
    return customer_profiles

def detect_rule_based_anomalies(df, profiles):
    print("Running Rule-Based Anomaly Detection...")
    
    # Merge profiles back to transactions
    df = df.merge(profiles, on='customer_id', how='left')
    
    results = []
    
    for index, row in df.iterrows():
        risk_score = 0
        reasons = []
        
        # Rule 1: High Amount ( > 3x average )
        # Handle cases where std might be NaN (single transaction)
        avg = row['avg_amount']
        if row['amount'] > (avg * 3) and avg > 10: # Only if avg is significant
            risk_score += 50
            reasons.append(f"Amount ${row['amount']} > 3x Avg (${round(avg, 2)})")
            
        # Rule 2: Round Numbers (often a sign of fraud if high)
        if row['amount'] > 1000 and row['amount'] % 100 == 0:
            risk_score += 20
            reasons.append("Large round number transaction")
            
        # Rule 3: Unknown Location (Synthetic rule logic)
        if row['location'] == 'Unknown_Location':
            risk_score += 30
            reasons.append("Suspicious Location")
            
        # Calculate final risk level
        risk_score = min(risk_score, 100)
        
        if risk_score > 0:
            if risk_score >= 80: level = 'CRITICAL'
            elif risk_score >= 50: level = 'HIGH'
            elif risk_score >= 20: level = 'MEDIUM'
            else: level = 'LOW'
            
            results.append({
                'transaction_id': row['transaction_id'],
                'risk_score': risk_score,
                'risk_level': level,
                'reason': "; ".join(reasons),
                'fraud_probability': 0.0 # Placeholder for ML
            })
            
    return pd.DataFrame(results)

def train_and_predict_ml(df, risk_df):
    print("Training ML Model (Isolation Forest)...")
    
    # Feature Engineering for ML
    # We will use Amount and Hour of day
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    
    features = df[['amount', 'hour']]
    
    # Isolation Forest
    model = IsolationForest(contamination=0.05, random_state=42)
    df['anomaly'] = model.fit_predict(features)
    df['score'] = model.decision_function(features)
    
    # Map -1 (anomaly) to high probability
    # This is a simplification. decision_function returns negative for anomalies.
    # We normalize to 0-1 loosely.
    
    # Identify ML anomalies
    ml_anomalies = df[df['anomaly'] == -1]
    
    print(f"ML Model detected {len(ml_anomalies)} anomalies.")
    
    # Merge ML results into risk results
    # If a transaction is already in risk_df, update it. If not, add it.
    
    final_results = risk_df.copy()
    
    for index, row in ml_anomalies.iterrows():
        t_id = row['transaction_id']
        prob = round(abs(row['score']), 2) # simplified probability
        
        if t_id in final_results['transaction_id'].values:
            # Update existing
            idx = final_results.index[final_results['transaction_id'] == t_id][0]
            final_results.at[idx, 'fraud_probability'] = prob
            # Boost score if ML also thinks it's bad
            final_results.at[idx, 'risk_score'] = min(final_results.at[idx, 'risk_score'] + 20, 100)
            final_results.at[idx, 'reason'] += " + ML Anomaly Detected"
        else:
            # Add new ML-only finding
            new_row = {
                'transaction_id': t_id,
                'risk_score': 40, # Base score for ML anomaly
                'risk_level': 'MEDIUM',
                'reason': "ML Anomaly Detected (Isolation Forest)",
                'fraud_probability': prob
            }
            final_results = pd.concat([final_results, pd.DataFrame([new_row])], ignore_index=True)
            
    return final_results

def save_results(conn, results):
    print(f"Saving {len(results)} risk insights to database...")
    # Clear old results to avoid duplicates in this simulation
    conn.execute("DELETE FROM risk_results")
    
    # Insert
    for index, row in results.iterrows():
        conn.execute("""
            INSERT INTO risk_results (transaction_id, risk_score, risk_level, reason, fraud_probability)
            VALUES (?, ?, ?, ?, ?)
        """, (row['transaction_id'], row['risk_score'], row['risk_level'], row['reason'], row['fraud_probability']))
    
    conn.commit()
    print("Done.")

def main():
    conn = create_connection()
    if not conn: return
    
    df = fetch_data(conn)
    if df.empty:
        print("No transactions found. Run data_generator.py first.")
        return
        
    profiles = calculate_profiles(df)
    
    # Step 1: Rule Based
    risk_results = detect_rule_based_anomalies(df, profiles)
    
    # Step 2: ML Based
    # For simulation purposes, we rely heavily on rule based, but let's run ML if we have enough data
    if len(df) > 100:
        risk_results = train_and_predict_ml(df, risk_results)
    
    save_results(conn, risk_results)
    conn.close()

if __name__ == "__main__":
    main()
