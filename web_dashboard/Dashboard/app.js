// Production: Relative path for Nginx Proxy (Antigravity)
const API_BASE = "/api";

// ---------------- INIT ----------------
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    fetchStats();
    fetchTransactions();

    setInterval(() => {
        const refreshEnabled = document.getElementById('setting-refresh')?.checked ?? true;
        if (refreshEnabled) {
            fetchStats();
            fetchTransactions();
        }
    }, 5000);
});

// ---------------- NAVIGATION ----------------
function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar nav li a');
    const views = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');

    const keyMap = {
        'Dashboard': 'view-dashboard',
        'Transactions': 'view-transactions',
        'Alerts': 'view-alerts',
        'Settings': 'view-settings'
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            document.querySelectorAll('.sidebar nav li').forEach(li => li.classList.remove('active'));
            link.parentElement.classList.add('active');

            const viewName = link.innerText.trim();
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

// ---------------- DATA ----------------
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
        renderCharts(data);
        renderTransactionsView(data);
        renderAlertsView(data);
    } catch (e) {
        console.error("Error fetching transactions:", e);
    }
}

// ---------------- TABLES ----------------
function renderDashboardTable(transactions) {
    const tbody = document.getElementById('dashboard-transactions-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    transactions.slice(0, 10).forEach(tx => tbody.appendChild(createTxRow(tx)));
}

let lastTxCount = 0;
let lastSearchTerm = '';

function renderTransactionsView(transactions) {
    const tbody = document.getElementById('all-transactions-body');
    if (!tbody) return;

    const searchTerm = document.getElementById('tx-search')?.value.toLowerCase() || '';
    if (transactions.length === lastTxCount && searchTerm === lastSearchTerm) return;

    lastTxCount = transactions.length;
    lastSearchTerm = searchTerm;

    tbody.innerHTML = '';

    const filtered = searchTerm
        ? transactions.filter(t =>
            t.id.toString().includes(searchTerm) ||
            (t.location && t.location.toLowerCase().includes(searchTerm))
        )
        : transactions;

    const displaySet = searchTerm ? filtered : filtered.slice(0, 500);
    displaySet.forEach(tx => tbody.appendChild(createTxRow(tx)));
}

document.getElementById('tx-search')?.addEventListener('input', () =>
    renderTransactionsView(globalTransactions)
);

// ---------------- ALERTS ----------------
function renderAlertsView(transactions) {
    const container = document.getElementById('alerts-container');
    if (!container) return;

    container.innerHTML = '';
    const criticals = transactions.filter(t => t.score > 70);

    if (!criticals.length) {
        container.innerHTML = '<div class="empty-state">No active high-priority alerts. Good job! ✅</div>';
        return;
    }

    criticals.forEach(tx => {
        const card = document.createElement('div');
        card.className = 'alert-card';
        card.innerHTML = `
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
                <h4>Suspicious Activity (#${tx.id})</h4>
                <p><strong>Reason:</strong> ${tx.reason}</p>
                <p><small>${tx.timestamp} • ${tx.location}</small></p>
            </div>
            <div class="alert-actions">
                <button class="btn-primary">Investigate</button>
                <button class="btn-secondary">Dismiss</button>
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
        <td>${tx.location}</td>
        <td>${tx.category || 'N/A'}</td>
        <td><input type="checkbox" ${tx.reviewed ? 'checked' : ''} disabled></td>
    `;

    return row;
}

function formatMoney(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

// ---------------- CHARTS ----------------
let riskTrendChart = null;
let locationChartInstance = null;
let vendorChartInstance = null;

function renderCharts(data) {
    const trendCanvas = document.getElementById('riskTrendChart');
    const locCanvas = document.getElementById('locationChart');
    const vendCanvas = document.getElementById('vendorChart');

    if (!trendCanvas || !locCanvas || !vendCanvas) return;

    if (riskTrendChart) riskTrendChart.destroy();
    if (locationChartInstance) locationChartInstance.destroy();
    if (vendorChartInstance) vendorChartInstance.destroy();

    const reversed = [...data].reverse().slice(-50);

    riskTrendChart = new Chart(trendCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: reversed.map(t => t.timestamp),
            datasets: [{ data: reversed.map(t => t.score), tension: 0.4, fill: true }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    const locationCounts = {};
    data.forEach(t => locationCounts[t.location || 'Unknown'] = (locationCounts[t.location || 'Unknown'] || 0) + 1);

    locationChartInstance = new Chart(locCanvas.getContext('2d'), {
        type: 'bar',
        data: { labels: Object.keys(locationCounts), datasets: [{ data: Object.values(locationCounts) }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    const vendorCounts = {};
    data.forEach(t => vendorCounts[t.category || 'Other'] = (vendorCounts[t.category || 'Other'] || 0) + 1);

    vendorChartInstance = new Chart(vendCanvas.getContext('2d'), {
        type: 'doughnut',
        data: { labels: Object.keys(vendorCounts), datasets: [{ data: Object.values(vendorCounts) }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
