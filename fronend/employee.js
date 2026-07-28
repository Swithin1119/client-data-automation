const API_BASE_URL = "http://127.0.0.1:8000";

let allClients = [];

// =====================================================
// LOAD CLIENTS
// =====================================================

async function loadClients() {
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

        console.log("API DATA:", data);

        allClients = Array.isArray(data.clients)
            ? data.clients
            : [];

        renderDashboard(allClients);

        const lastSync = document.getElementById("lastSync");

        if (lastSync) {
            lastSync.textContent = new Date().toLocaleTimeString();
        }

    } catch (error) {
        console.error("Failed to load clients:", error);
    }
}

// =====================================================
// RENDER DASHBOARD
// =====================================================

function renderDashboard(clients) {

    const table = document.getElementById("clientTable");
    const totalClients = document.getElementById("totalClients");
    const newToday = document.getElementById("newToday");
    const recordCount = document.getElementById("recordCount");

    if (!table) {
        console.error("clientTable not found");
        return;
    }

    // =================================================
    // TOTAL CLIENTS
    // =================================================

    if (totalClients) {
        totalClients.textContent = clients.length;
    }

    // =================================================
    // NEW CLIENTS TODAY
    // Supports both date formats:
    // 2026-07-27 08:08:10 AM
    // 27-07-2026 08:08:10 AM
    // =================================================

    const now = new Date();

    const todayISO =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const todayDDMMYYYY =
        `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;

    const todayClients = clients.filter(client => {
        const createdAt = String(client.created_at || "");
        return (
            createdAt.startsWith(todayISO) ||
            createdAt.startsWith(todayDDMMYYYY)
        );
    });

    if (newToday) {
        newToday.textContent = todayClients.length;
    }

    // =================================================
    // NO CLIENTS
    // =================================================

    if (clients.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center;">
                    No clients found
                </td>
            </tr>
        `;

        if (recordCount) {
            recordCount.textContent = "Showing 0 records";
        }

        return;
    }

    // =================================================
    // TABLE ROWS
    // =================================================

    let tableHTML = "";

    clients.forEach(client => {
        tableHTML += `
            <tr>
                <td>${escapeHTML(client.portal_id)}</td>
                <td>${escapeHTML(client.first_name)}</td>
                <td>${escapeHTML(client.last_name)}</td>
                <td>${escapeHTML(client.address)}</td>
                <td>${escapeHTML(client.street)}</td>
                <td>${escapeHTML(client.region)}</td>
                <td>${escapeHTML(client.postal_code)}</td>
                <td>${escapeHTML(client.phone_number)}</td>
                <td>${escapeHTML(client.created_at)}</td>
                <td>
                    <span class="status-badge">Active</span>
                </td>
            </tr>
        `;
    });

    table.innerHTML = tableHTML;

    // =================================================
    // RECORD COUNT
    // =================================================

    if (recordCount) {
        recordCount.textContent = `Showing ${clients.length} records`;
    }
}

// =====================================================
// HTML SECURITY
// =====================================================

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =====================================================
// DOWNLOAD EXCEL
// =====================================================

function downloadExcel() {
    window.open(`${API_BASE_URL}/download-excel`, "_blank");
}

// =====================================================
// SEARCH
// =====================================================

function setupSearch() {
    const searchInput = document.getElementById("searchInput");

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener("input", function () {
        const searchText = this.value.toLowerCase().trim();

        const filteredClients = allClients.filter(client => {
            const searchableText = [
                client.portal_id,
                client.first_name,
                client.last_name,
                client.address,
                client.street,
                client.region,
                client.postal_code,
                client.phone_number,
                client.created_at
            ]
            .map(value => String(value || ""))
            .join(" ")
            .toLowerCase();

            return searchableText.includes(searchText);
        });

        renderDashboard(filteredClients);
    });
}

// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    loadClients();
    setupSearch();
});