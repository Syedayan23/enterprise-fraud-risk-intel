package src;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.Map;
import com.google.gson.Gson;

public class RiskApiServer {
    private static final int PORT = 8080;
    private static final Gson gson = new Gson();

    public static void main(String[] args) throws IOException {
        // Ensure DB is initialized
        DatabaseManager.initializeDatabaseIfEmpty();

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // Contexts
        server.createContext("/api/transactions", new TransactionsHandler());
        server.createContext("/api/stats", new StatsHandler());
        server.createContext("/api/simulate", new SimulationHandler());

        // Default executor
        server.setExecutor(null);

        System.out.println("Starting Server on Port " + PORT);
        server.start();
    }

    static class TransactionsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            addCORSHeaders(t);
            if ("GET".equals(t.getRequestMethod())) {
                List<Map<String, Object>> transactions = DatabaseManager.getRecentTransactions();
                String response = gson.toJson(transactions);
                sendResponse(t, response);
            } else {
                t.sendResponseHeaders(405, -1); // Method Not Allowed
            }
        }
    }

    static class StatsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            addCORSHeaders(t);
            if ("GET".equals(t.getRequestMethod())) {
                Map<String, Integer> stats = DatabaseManager.getRiskStats();
                String response = gson.toJson(stats);
                sendResponse(t, response);
            } else {
                t.sendResponseHeaders(405, -1);
            }
        }
    }

    private static void sendResponse(HttpExchange t, String response) throws IOException {
        byte[] bytes = response.getBytes("UTF-8");
        t.sendResponseHeaders(200, bytes.length);
        OutputStream os = t.getResponseBody();
        os.write(bytes);
        os.close();
    }

    // Integration with Python Microservice
    private static void callPythonAnalysis() {
        try {
            // Antigravity: Python is on localhost within the same container
            java.net.URL url = new java.net.URL("http://127.0.0.1:5000/analyze");
            java.net.HttpURLConnection con = (java.net.HttpURLConnection) url.openConnection();
            con.setRequestMethod("POST");
            int responseCode = con.getResponseCode();
            System.out.println("Python Analysis Triggered. Response Code: " + responseCode);
        } catch (Exception e) {
            System.err.println("Failed to call Python Engine: " + e.getMessage());
        }
    }

    static class SimulationHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            addCORSHeaders(t);
            if ("POST".equals(t.getRequestMethod())) {
                DatabaseManager.addMockData(5);

                // Trigger Python Analysis asynchronously
                new Thread(() -> callPythonAnalysis()).start();

                String response = "{\"message\": \"Simulation and Analysis triggered\", \"added\": 5}";
                sendResponse(t, response);
            } else if ("OPTIONS".equals(t.getRequestMethod())) {
                t.sendResponseHeaders(204, -1);
            } else {
                t.sendResponseHeaders(405, -1);
            }
        }
    }

    private static void addCORSHeaders(HttpExchange t) {
        t.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        t.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        t.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
    }
}
