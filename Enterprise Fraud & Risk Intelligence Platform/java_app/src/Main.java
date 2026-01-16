package src;

import javax.swing.SwingUtilities;

public class Main {
    public static void main(String[] args) {
        // Ensure DB exists (robustness check if Python failed)
        DatabaseManager.initializeDatabaseIfEmpty();
        
        // Launch UI
        SwingUtilities.invokeLater(() -> {
            DashboardUI dashboard = new DashboardUI();
            dashboard.setVisible(true);
        });
    }
}
