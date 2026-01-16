// Production: Relative path for Nginx Proxy (Antigravity)
const API_BASE = "/api";

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    fetchStats();
    fetchTransactions(); // Initial Load

    // Auto-refresh unless disabled
    setInterval(() => {
        const refreshEnabled = document.getElementById('setting-refresh')?.checked ?? true;
        if (refreshEnabled) {
            fetchStats();
            fetchTransactions();
        }
    }, 5000);
});

function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar nav li a');
    const views = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');

    // Map text to ID
    const keyMap = {
        'Dashboard': 'view-dashboard',
        'Transactions': 'view-transactions',
        'Alerts': 'view-alerts',
        'Settings': 'view-settings'
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // UI Active State
            document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
            link.parentElement.classList.add('active');

            // Switch View
            const viewName = link.innerText;
            const targetId = keyMap[viewName];

            pageTitle.innerText = viewName === 'Dashboard' ? 'Risk Monitoring Dashboard' : viewName;

            views.forEach(v => v.style.display = 'none');
            const target = document.getElementById(targetId);
            if (target) {
                target.style.display = 'block';
                target.classList.add('fade-in');
            }
        });
    });
}

async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        const data = await res.json();

        document.getElementById('stat-critical').innerText = data.CRITICAL || 0;
        document.getElementById('stat-high').innerText = data.HIGH || 0;
        document.getElementById('stat-medium').innerText = data.MEDIUM || 0;
        document.getElementById('stat-low').innerText = data.LOW || 0;
    } catch (e) {
        console.error("Error fetching stats:", e);
    }
}

let globalTransactions = [];

async function fetchTransactions() {
    try {
        const res = await fetch(`${API_BASE}/transactions`);
        const data = await res.json();
        globalTransactions = data;

        renderDashboardTable(data);
        renderCharts(data); // Fixed function name
        renderTransactionsView(data);
        renderAlertsView(data);
    } catch (e) {
        console.error("Error fetching transactions:", e);
    }
}

function renderDashboardTable(transactions) {
    const tbody = document.getElementById('dashboard-transactions-body');
    if (!tbody) return; // Guard
    tbody.innerHTML = '';

    // Show top 10 on dashboard
    transactions.slice(0, 10).forEach(tx => {
        const row = createTxRow(tx);
        tbody.appendChild(row);
    });
}

let lastTxCount = 0;
let lastSearchTerm = '';

function renderTransactionsView(transactions) {
    const tbody = document.getElementById('all-transactions-body');
    if (!tbody) return;

    // Performance Optimization: Only re-render if data count changes or search changes
    const searchTerm = document.getElementById('tx-search')?.value.toLowerCase() || '';

    // If exact same data state, skip render (preserves scroll position)
    if (transactions.length === lastTxCount && searchTerm === lastSearchTerm) {
        return;
    }

    lastTxCount = transactions.length;
    lastSearchTerm = searchTerm;

    tbody.innerHTML = '';

    const filtered = searchTerm
        ? transactions.filter(t => t.id.toString().includes(searchTerm) || (t.location && t.location.toLowerCase().includes(searchTerm)))
        : transactions;

    // Limit to 500 for rendering performance if no search
    const displaySet = searchTerm ? filtered : filtered.slice(0, 500);

    displaySet.forEach(tx => {
        const row = createTxRow(tx);
        tbody.appendChild(row);
    });

    if (!searchTerm && transactions.length > 500) {
        const infoRow = document.createElement('tr');
        infoRow.innerHTML = `<td colspan="8" style="text-align:center; color: var(--text-secondary); padding: 20px;">Showing recent 500 of ${transactions.length} transactions. Use search to find older ones.</td>`;
        tbody.appendChild(infoRow);
    }
}

// Bind search
document.getElementById('tx-search')?.addEventListener('input', () => renderTransactionsView(globalTransactions));

function renderAlertsView(transactions) {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    container.innerHTML = '';

    const criticals = transactions.filter(t => t.score > 70);

    if (criticals.length === 0) {
        container.innerHTML = '<div class="empty-state">No active high-priority alerts. Good job! ✅</div>';
        return;
    }

    criticals.forEach(tx => {
        const card = document.createElement('div');
        card.className = 'alert-card';
        card.innerHTML = `
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
                <h4>Suspicious Activity Detected (#${tx.id})</h4>
                <p><strong>Reason:</strong> ${tx.reason}</p>
                <p><small>${tx.timestamp} • ${tx.location}</small></p>
            </div>
             <div class="alert-actions">
                <button class="btn-primary" onclick="alert('Case #${tx.id} assigned to you.')">Investigate</button>
                <button class="btn-secondary" onclick="alert('Case #${tx.id} dismissed.')">Dismiss</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function createTxRow(tx) {
    const row = document.createElement('tr');
    const badgeClass = `badge-${tx.level.toLowerCase()}`;
    row.innerHTML = `
        <td>#${tx.id}</td>
        <td>${tx.timestamp}</td>
        <td>${formatMoney(tx.amount)}</td>
        <td>${Math.round(tx.score)}</td>
        <td><span class="badge ${badgeClass}">${tx.level}</span></td>
        <td>${tx.reason}</td>
        <td>${tx.reviewed ? 'Reviewed' : 'New'}</td>
    `;
    return row;
}

function formatMoney(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

// --- Interactivity ---

function showModal(tx) {
    const modal = document.getElementById('tx-modal');
    const body = document.getElementById('modal-body');

    body.innerHTML = `
        <div class="modal-detail-row"><span>Transaction ID:</span> <strong>#${tx.id}</strong></div>
        <div class="modal-detail-row"><span>Date:</span> <span>${tx.timestamp}</span></div>
        <div class="modal-detail-row"><span>Amount:</span> <strong>${formatMoney(tx.amount)}</strong></div>
        <div class="modal-detail-row"><span>Vendor Category:</span> <span>${tx.category || 'N/A'}</span></div>
        <div class="modal-detail-row"><span>Location:</span> <span>${tx.location}</span></div>
        <div class="modal-detail-row" style="margin-top: 10px;">
            <span>Risk Score:</span> 
            <span class="badge badge-${tx.level.toLowerCase()}" style="font-size: 1rem;">${Math.round(tx.score)} (${tx.level})</span>
        </div>
        <div class="modal-detail-row"><span>Primary Reason:</span> <span style="color: var(--risk-critical);">${tx.reason}</span></div>
    `;

    modal.classList.add('active');

    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };

    document.querySelector('.close-modal').onclick = () => modal.classList.remove('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div>${message}</div>`;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Modify createTxRow to add click listener and more details for the main transactions view
function createTxRow(tx) {
    const row = document.createElement('tr');
    const badgeClass = `badge-${tx.level.toLowerCase()}`;
    row.innerHTML = `
        <td>#${tx.id}</td>
        <td>${tx.timestamp}</td>
        <td>${formatMoney(tx.amount)}</td>
        <td>${Math.round(tx.score)}</td>
        <td><span class="badge ${badgeClass}">${tx.level}</span></td>
        <td>${tx.reason}</td>
        <td>${tx.location}</td>
        <td>${tx.category || 'N/A'}</td> <!-- Added details -->
         <td><input type="checkbox" ${tx.reviewed ? 'checked' : ''} disabled></td>
     `;

    // Add interactive click
    row.onclick = () => showModal(tx);

    return row;
}

// Theme Toggle Logic
const themeToggle = document.querySelector('#view-settings input[type="checkbox"][disabled]');
// Note: User asked to enable this.
if (themeToggle) {
    themeToggle.disabled = false;
    themeToggle.checked = false; // Default to dark (unchecked)
    themeToggle.parentElement.querySelector('small').innerText = "(Toggle for Light Mode)";

    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    });
}

function triggerSimulation() {
    fetch(`${API_BASE}/simulate`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            showToast(`🚀 Simulation: ${data.added} new transactions injected!`, 'success');
            fetchStats();
            fetchTransactions();
        })
        .catch(err => showToast("Simulation failed: " + err, 'critical'));
}

function exportData() {
    alert("Exporting PDF... (Feature mock)");
}

// Chart.js Instances
let riskTrendChart = null;

function renderCharts(data) {
    // Basic Trend Logic: Group by last few timestamps (mocking trend for now using simple index)
    // In a real app, we'd aggregate by hour/minute. 
    // Here we just plot the last 10 scores to show variance.

    // Risk Trend Chart
    if (window.riskTrendChart) {
        window.riskTrendChart.destroy();
    }
    const ctx = document.getElementById('riskTrendChart').getContext('2d');
    window.riskTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Risk Scores',
                data: [],
                borderColor: '#3b82f6',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100 },
                x: { display: false }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Update Trend Data
    const reversed = [...data].reverse().slice(-50); // Show last 50 points
    window.riskTrendChart.data.labels = reversed.map(t => {
        // Handle various timestamp formats robustly
        const dateStr = t.timestamp.replace(' ', 'T'); // Ensure ISO format
        const date = new Date(dateStr);
        return isNaN(date) ? t.timestamp : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    window.riskTrendChart.data.datasets[0].data = reversed.map(t => t.score);
    window.riskTrendChart.update();

    // Location Chart
    // Aggregate risk counts by location
    const locationCounts = {};
    data.forEach(t => {
        const loc = t.location || 'Unknown';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    const locLabels = Object.keys(locationCounts);
    const locData = Object.values(locationCounts);

    if (window.locationChartInstance) {
        window.locationChartInstance.destroy();
    }
    const ctxLoc = document.getElementById('locationChart').getContext('2d');
    window.locationChartInstance = new Chart(ctxLoc, {
        type: 'bar',
        data: {
            labels: locLabels,
            datasets: [{
                label: 'Risks by Location',
                data: locData,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(239, 68, 68, 0.6)',
                    'rgba(249, 115, 22, 0.6)',
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(168, 85, 247, 0.6)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#2d3748' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Vendor Category Chart
    const vendorCounts = {};
    data.forEach(t => {
        const cat = t.category || 'Uncategorized';
        vendorCounts[cat] = (vendorCounts[cat] || 0) + 1;
    });

    const vendLabels = Object.keys(vendorCounts);
    const vendData = Object.values(vendorCounts);

    if (window.vendorChartInstance) {
        window.vendorChartInstance.destroy();
    }
    const ctxVend = document.getElementById('vendorChart').getContext('2d');
    window.vendorChartInstance = new Chart(ctxVend, {
        type: 'doughnut',
        data: {
            labels: vendLabels,
            datasets: [{
                data: vendData,
                backgroundColor: [
                    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8' } }
            }
        }
    });
}
