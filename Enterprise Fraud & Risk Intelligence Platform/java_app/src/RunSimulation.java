package src;

public class RunSimulation {
    public static void main(String[] args) {
        System.out.println("Starting heavy simulation (Populating 2000 records)...");
        // Reuse existing logic but more of it
        DatabaseManager.addMockData(2000);
        System.out.println("Simulation Data Populated Successfully.");
    }
}
