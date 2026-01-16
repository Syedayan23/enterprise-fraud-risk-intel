package src;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DatabaseManager {
    private static final String DEFAULT_DB_URL = "jdbc:sqlite:../database/fraud_platform.db";

    private static String getDbUrl() {
        String envPath = System.getenv("DB_PATH");
        if (envPath != null && !envPath.isEmpty()) {
            return "jdbc:sqlite:" + envPath;
        }
        return DEFAULT_DB_URL;
    }

    public static Connection connect() {
        Connection conn = null;
        try {
            Class.forName("org.sqlite.JDBC");
            conn = DriverManager.getConnection(getDbUrl());
        } catch (ClassNotFoundException | SQLException e) {
            System.out.println("Connection Failed: " + e.getMessage());
        }
        return conn;
    }

    public static void initializeDatabaseIfEmpty() {
        try (Connection conn = connect()) {
            if (conn != null) {
                DatabaseMetaData dbm = conn.getMetaData();
                ResultSet tables = dbm.getTables(null, null, "customers", null);

                if (!tables.next()) {
                    System.out.println("Database empty or missing. Initializing with schema...");
                    Statement stmt = conn.createStatement();

                    // Tables
                    stmt.execute(
                            "CREATE TABLE IF NOT EXISTS customers (customer_id INTEGER PRIMARY KEY, name TEXT, location TEXT)");
                    stmt.execute(
                            "CREATE TABLE IF NOT EXISTS vendors (vendor_id INTEGER PRIMARY KEY, name TEXT, category TEXT)");
                    stmt.execute(
                            "CREATE TABLE IF NOT EXISTS transactions (transaction_id INTEGER PRIMARY KEY, customer_id INTEGER, vendor_id INTEGER, amount REAL, timestamp TEXT, location TEXT, status TEXT)");
                    stmt.execute(
                            "CREATE TABLE IF NOT EXISTS risk_results (result_id INTEGER PRIMARY KEY, transaction_id INTEGER, risk_score REAL, risk_level TEXT, reason TEXT, is_reviewed BOOLEAN DEFAULT 0, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, fraud_probability REAL)");

                    // Seed Vendors with Categories
                    stmt.execute(
                            "INSERT INTO vendors (name, category) VALUES ('Amazon', 'Retail'), ('Uber', 'Services'), ('Walmart', 'Retail'), ('Netflix', 'Digital'), ('Starbucks', 'Food'), ('Apple', 'Electronics')");

                    // Seed Customers
                    stmt.execute(
                            "INSERT INTO customers (name, location) VALUES ('John Doe', 'NY'), ('Jane Smith', 'CA'), ('Bob Lee', 'TX')");

                    System.out.println("Seeding 500 mock transactions...");
                    addMockData(500);
                } else {
                    Statement stmt = conn.createStatement();
                    ResultSet rs = stmt.executeQuery("SELECT count(*) FROM customers");
                    if (rs.next() && rs.getInt(1) == 0) {
                        System.out.println("Tables exist but are empty. Seeding data...");
                        seedData(conn);
                    }
                }
            }
        } catch (SQLException e) {
            System.out.println("Init Error: " + e.getMessage());
        }
    }

    private static void createSchema(Connection conn) throws SQLException {
        Statement stmt = conn.createStatement();
        String sql = "CREATE TABLE IF NOT EXISTS customers (customer_id INTEGER PRIMARY KEY, name TEXT, age INTEGER, location TEXT, avg_transaction_val REAL);"
                + "CREATE TABLE IF NOT EXISTS vendors (vendor_id INTEGER PRIMARY KEY, name TEXT, category TEXT, risk_rating REAL);"
                + "CREATE TABLE IF NOT EXISTS transactions (transaction_id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, vendor_id INTEGER, amount REAL, timestamp DATETIME, location TEXT, status TEXT);"
                + "CREATE TABLE IF NOT EXISTS risk_results (result_id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id INTEGER, risk_score REAL, risk_level TEXT, reason TEXT, fraud_probability REAL, is_reviewed BOOLEAN DEFAULT 0, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);";
        stmt.executeUpdate(sql);
    }

    private static void seedData(Connection conn) throws SQLException {
        Statement stmt = conn.createStatement();
        stmt.executeUpdate(
                "INSERT INTO customers (name, location) VALUES ('Alice Inc', 'New York'), ('Bob Corp', 'London'), ('Charlie LLC', 'Singapore')");
        stmt.executeUpdate(
                "INSERT INTO vendors (name, category) VALUES ('TechSoft', 'Software'), ('GlobalLogistics', 'Shipping')");
        stmt.executeUpdate(
                "INSERT INTO transactions (customer_id, vendor_id, amount, timestamp, status) VALUES (1, 1, 5000.00, '2023-10-27 10:00:00', 'completed')");
        stmt.executeUpdate(
                "INSERT INTO transactions (customer_id, vendor_id, amount, timestamp, location, status) VALUES (1, 2, 15000.00, '2023-10-27 10:05:00', 'New York', 'completed')");
        stmt.executeUpdate(
                "INSERT INTO risk_results (transaction_id, risk_score, risk_level, reason) VALUES (2, 85.0, 'CRITICAL', 'Amount > 3x Avg')");
        System.out.println("Backup data seeded.");
    }

    public static void addMockData(int count) {
        try (Connection conn = connect()) {
            if (conn == null)
                return;
            if (conn == null)
                return;
            Statement stmt = conn.createStatement();

            String[] locations = { "New York", "London", "Singapore", "Tokyo", "Berlin", "Unknown_Location" };
            String[] timestamps = { "2023-10-25 10:00:00", "2023-10-25 12:30:00", "2023-10-26 09:15:00",
                    "2023-10-26 14:45:00", "2023-10-27 18:00:00" };

            for (int i = 0; i < count; i++) {
                int custId = 1 + (int) (Math.random() * 3);
                int vendId = 1 + (int) (Math.random() * 6); // 6 vendors
                double amount = 10 + (Math.random() * 5000);
                boolean isRisky = Math.random() > 0.8; // 20% risk chance
                if (isRisky)
                    amount *= 3;

                // Generate consistent timestamps for chart trends
                String ts = java.time.LocalDateTime.now().minusHours((long) (Math.random() * 24 * 7)).toString()
                        .replace("T", " ");
                String loc = locations[(int) (Math.random() * locations.length)];

                String insertTx = String.format(
                        "INSERT INTO transactions (customer_id, vendor_id, amount, timestamp, location, status) " +
                                "VALUES (%d, %d, %.2f, '%s', '%s', 'completed')",
                        custId, vendId, amount, ts, loc);
                stmt.executeUpdate(insertTx);

                ResultSet rs = stmt.executeQuery("SELECT last_insert_rowid()");
                int txId = 0;
                if (rs.next())
                    txId = rs.getInt(1);

                if (txId > 0) {
                    double score = isRisky ? 60 + (Math.random() * 40) : (Math.random() * 30);
                    String level = score > 80 ? "CRITICAL" : (score > 50 ? "HIGH" : "LOW");
                    String reason = isRisky ? "High Value / Suspicious Loc" : "Normal Activity";

                    String insertRisk = String.format(
                            "INSERT INTO risk_results (transaction_id, risk_score, risk_level, reason, fraud_probability, timestamp) "
                                    + "VALUES (%d, %.2f, '%s', '%s', 0.0, '%s')",
                            txId, score, level, reason, ts);
                    stmt.executeUpdate(insertRisk);
                }
            }
            System.out.println("Added " + count + " mock entries with rich data.");
        } catch (SQLException e) {
            System.out.println("Error adding mock data: " + e.getMessage());
        }
    }

    public static List<Map<String, Object>> getRecentTransactions() {
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection conn = connect()) {
            if (conn == null)
                return list;

            String query = "SELECT r.transaction_id, t.amount, r.risk_score, r.risk_level, r.reason, r.is_reviewed, t.timestamp, t.location, v.category "
                    +
                    "FROM risk_results r " +
                    "JOIN transactions t ON r.transaction_id = t.transaction_id " +
                    "LEFT JOIN vendors v ON t.vendor_id = v.vendor_id " +
                    "ORDER BY r.timestamp DESC LIMIT 100";

            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(query);

            while (rs.next()) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", rs.getInt("transaction_id"));
                map.put("amount", rs.getDouble("amount"));
                map.put("score", rs.getDouble("risk_score"));
                map.put("level", rs.getString("risk_level"));
                map.put("reason", rs.getString("reason"));
                map.put("reviewed", rs.getBoolean("is_reviewed"));
                map.put("timestamp", rs.getString("timestamp"));
                map.put("location", rs.getString("location"));
                map.put("category", rs.getString("category")); // Added details
                list.add(map);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public static Map<String, Integer> getRiskStats() {
        Map<String, Integer> stats = new HashMap<>();
        stats.put("CRITICAL", 0);
        stats.put("HIGH", 0);
        stats.put("MEDIUM", 0);
        stats.put("LOW", 0);

        try (Connection conn = connect()) {
            if (conn == null)
                return stats;
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt
                    .executeQuery("SELECT risk_level, COUNT(*) as count FROM risk_results GROUP BY risk_level");
            while (rs.next()) {
                stats.put(rs.getString("risk_level"), rs.getInt("count"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return stats;
    }
}
