package src;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

public class DashboardUI extends JFrame {
    private JTable table;
    private DefaultTableModel tableModel;
    private JLabel statusLabel;

    public DashboardUI() {
        setTitle("Enterprise Fraud & Risk Intelligence Platform");
        setSize(1000, 600);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);

        // Layout
        setLayout(new BorderLayout());

        // Header
        JPanel headerPanel = new JPanel();
        headerPanel.setBackground(new Color(40, 44, 52));
        JLabel title = new JLabel("RISK MONITORING DASHBOARD");
        title.setForeground(Color.WHITE);
        title.setFont(new Font("Arial", Font.BOLD, 20));
        headerPanel.add(title);
        add(headerPanel, BorderLayout.NORTH);

        // Controls
        JPanel controlPanel = new JPanel();
        JButton refreshBtn = new JButton("Refresh Data");
        refreshBtn.addActionListener(e -> loadData());
        JButton exportBtn = new JButton("Print / Export to PDF");
        exportBtn.setBackground(new Color(220, 53, 69)); // Reddish for PDF
        exportBtn.setForeground(Color.WHITE);
        exportBtn.addActionListener(e -> {
            try {
                boolean complete = table.print(JTable.PrintMode.FIT_WIDTH,
                        new java.text.MessageFormat("Fraud Detection Report"),
                        new java.text.MessageFormat("Page - {0}"));
                if (complete) {
                    JOptionPane.showMessageDialog(this, "Printing Complete", "Result", JOptionPane.INFORMATION_MESSAGE);
                } else {
                    JOptionPane.showMessageDialog(this, "Printing Cancelled", "Result",
                            JOptionPane.INFORMATION_MESSAGE);
                }
            } catch (Exception ex) {
                ex.printStackTrace();
                JOptionPane.showMessageDialog(this, "Printing Failed: " + ex.getMessage());
            }
        });

        JButton simBtn = new JButton("Simulate Traffic (+10)");
        simBtn.setBackground(new Color(70, 130, 180));
        simBtn.setForeground(Color.WHITE);
        simBtn.addActionListener(e -> {
            DatabaseManager.addMockData(10);
            loadData();
            JOptionPane.showMessageDialog(this, "Added 10 new transactions!");
        });

        controlPanel.add(refreshBtn);
        controlPanel.add(simBtn);
        controlPanel.add(exportBtn);
        add(controlPanel, BorderLayout.SOUTH);

        // Table
        String[] columnNames = { "ID", "Transaction Amount", "Risk Score", "Risk Level", "Reason", "Status" };
        tableModel = new DefaultTableModel(columnNames, 0);
        table = new JTable(tableModel);
        JScrollPane scrollPane = new JScrollPane(table);
        add(scrollPane, BorderLayout.CENTER);

        // Initial Load
        loadData();
    }

    private void loadData() {
        tableModel.setRowCount(0); // Clear existing

        try (Connection conn = DatabaseManager.connect()) {
            if (conn == null)
                return;

            String query = "SELECT r.transaction_id, t.amount, r.risk_score, r.risk_level, r.reason, r.is_reviewed " +
                    "FROM risk_results r " +
                    "JOIN transactions t ON r.transaction_id = t.transaction_id " +
                    "ORDER BY r.risk_score DESC LIMIT 50";

            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(query);

            while (rs.next()) {
                int id = rs.getInt("transaction_id");
                double amt = rs.getDouble("amount");
                double score = rs.getDouble("risk_score");
                String level = rs.getString("risk_level");
                String reason = rs.getString("reason");
                boolean reviewed = rs.getBoolean("is_reviewed");

                Object[] row = { id, String.format("$%.2f", amt), score, level, reason, reviewed ? "Reviewed" : "New" };
                tableModel.addRow(row);
            }
        } catch (Exception e) {
            e.printStackTrace();
            JOptionPane.showMessageDialog(this, "Error loading data: " + e.getMessage());
        }
    }
}
