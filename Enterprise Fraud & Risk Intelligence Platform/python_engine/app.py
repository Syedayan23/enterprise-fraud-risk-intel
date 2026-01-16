from flask import Flask, jsonify
import risk_engine
import os
import sqlite3

app = Flask(__name__)

# Override DB Path for Docker
if os.environ.get('DOCKER_ENV'):
    risk_engine.DB_PATH = "/data/fraud_platform.db"

@app.route('/analyze', methods=['POST'])
def run_analysis():
    try:
        conn = risk_engine.create_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        # Run the analysis pipeline from risk_engine.py
        df = risk_engine.fetch_data(conn)
        profiles = risk_engine.calculate_profiles(df)
        risk_df = risk_engine.detect_rule_based_anomalies(df, profiles)
        
        # Simple summary for response
        summary = {
            "total_transactions": len(df),
            "flagged_risks": len(risk_df)
        }
        
        # In a real app, we might write results back to DB here or return them
        # For now, let's assume risk_engine logic might need a tweak to save results 
        # but for this demo step we just return the summary.
        
        return jsonify({"message": "Analysis complete", "stats": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
