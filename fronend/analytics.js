const API_BASE_URL = "http://127.0.0.1:8000";

let trendChartInstance = null;
let regionChartInstance = null;
let topRegionsChartInstance = null;


// =====================================================
// PARSE "DD-MM-YYYY HH:MM:SS AM/PM" INTO A DATE
// =====================================================

function parseCreatedAt(value) {

    if (!value) {
        return null;
    }

    const match = String(value).match(
        /^(\d{2})-(\d{2})-(\d{4})/
    );

    if (!match) {
        return null;
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);

    return new Date(year, month, day);
}


function formatDateLabel(date) {
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}


// =====================================================
// LOAD DATA
// =====================================================

async function loadAnalytics() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/clients?t=${Date.now()}`,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        const clients = Array.isArray(data.clients)
            ? data.clients
            : [];

        renderStats(clients);
        renderTrendChart(clients);
        renderRegionChart(clients);
        renderTopRegionsChart(clients);

    } catch (error) {
        console.error("Failed to load analytics:", error);
    }
}


// =====================================================
// STAT CARDS
// =====================================================

function renderStats(clients) {

    const statTotal = document.getElementById("statTotal");
    const statToday = document.getElementById("statToday");
    const statRegions = document.getElementById("statRegions");
    const statBusiestDay = document.getElementById("statBusiestDay");

    if (statTotal) {
        statTotal.textContent = clients.length;
    }

    const now = new Date();

    const todayCount = clients.filter(client => {
        const date = parseCreatedAt(client.created_at);
        return (
            date &&
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
        );
    }).length;

    if (statToday) {
        statToday.textContent = todayCount;
    }

    const regionSet = new Set(
        clients
            .map(client => String(client.region || "").trim().toLowerCase())
            .filter(region => region !== "")
    );

    if (statRegions) {
        statRegions.textContent = regionSet.size;
    }

    // Busiest day by count
    const dayCounts = {};

    clients.forEach(client => {
        const date = parseCreatedAt(client.created_at);
        if (!date) {
            return;
        }
        const label = formatDateLabel(date);
        dayCounts[label] = (dayCounts[label] || 0) + 1;
    });

    let busiestLabel = "—";
    let busiestCount = 0;

    Object.entries(dayCounts).forEach(([label, count]) => {
        if (count > busiestCount) {
            busiestCount = count;
            busiestLabel = label;
        }
    });

    if (statBusiestDay) {
        statBusiestDay.textContent = busiestLabel;
    }
}


// =====================================================
// TREND CHART (LINE) - CLIENTS ADDED OVER TIME
// =====================================================

function renderTrendChart(clients) {

    const canvas = document.getElementById("trendChart");

    if (!canvas) {
        return;
    }

    const dayCounts = {};

    clients.forEach(client => {
        const date = parseCreatedAt(client.created_at);
        if (!date) {
            return;
        }
        const label = formatDateLabel(date);
        dayCounts[label] = (dayCounts[label] || 0) + 1;
    });

    const sortedLabels = Object.keys(dayCounts).sort((a, b) => {
        const [da, ma] = a.split("-").map(Number);
        const [db, mb] = b.split("-").map(Number);
        return (ma - mb) || (da - db);
    });

    const values = sortedLabels.map(label => dayCounts[label]);

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels: sortedLabels,
            datasets: [{
                label: "Clients Added",
                data: values,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.08)",
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointBackgroundColor: "#2563eb"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: "#f2f4f7" }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}


// =====================================================
// REGION CHART (DOUGHNUT)
// =====================================================

const CHART_COLORS = [
    "#2563eb", "#12b76a", "#ea580c", "#6941c6",
    "#0891b2", "#dc2626", "#eab308", "#64748b"
];


function renderRegionChart(clients) {

    const canvas = document.getElementById("regionChart");

    if (!canvas) {
        return;
    }

    const regionCounts = {};

    clients.forEach(client => {
        const region = String(client.region || "Unknown").trim() || "Unknown";
        regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    const labels = Object.keys(regionCounts);
    const values = Object.values(regionCounts);

    if (regionChartInstance) {
        regionChartInstance.destroy();
    }

    regionChartInstance = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderWidth: 2,
                borderColor: "#ffffff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
                legend: {
                    position: "right",
                    labels: {
                        boxWidth: 10,
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}


// =====================================================
// TOP REGIONS CHART (BAR)
// =====================================================

function renderTopRegionsChart(clients) {

    const canvas = document.getElementById("topRegionsChart");

    if (!canvas) {
        return;
    }

    const regionCounts = {};

    clients.forEach(client => {
        const region = String(client.region || "Unknown").trim() || "Unknown";
        regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    const sorted = Object.entries(regionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const labels = sorted.map(entry => entry[0]);
    const values = sorted.map(entry => entry[1]);

    if (topRegionsChartInstance) {
        topRegionsChartInstance.destroy();
    }

    topRegionsChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Clients",
                data: values,
                backgroundColor: "#2563eb",
                borderRadius: 6,
                maxBarThickness: 42
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: "#f2f4f7" }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}


// =====================================================
// REFRESH BUTTON
// =====================================================

function setupRefreshButton() {

    const button = document.getElementById("topRefreshButton");

    if (!button) {
        return;
    }

    button.addEventListener("click", function () {
        loadAnalytics();
    });
}


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    loadAnalytics();
    setupRefreshButton();
});