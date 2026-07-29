const API_BASE_URL = "https://clientflow-backend-py6m.onrender.com";

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

        // -------------------------------------------
        // AUTO-SAVE EXCEL TO LOCAL PC FOLDER (if enabled)
        // -------------------------------------------

        autoSaveExcelToFolder();

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
// REFRESH BUTTONS
// =====================================================

function setupRefreshButtons() {
    const refreshButton = document.getElementById("refreshButton");
    const topRefreshButton = document.getElementById("topRefreshButton");

    if (refreshButton) {
        refreshButton.addEventListener("click", loadClients);
    }

    if (topRefreshButton) {
        topRefreshButton.addEventListener("click", loadClients);
    }
}

// =====================================================
// DOWNLOAD BUTTON
// =====================================================

function setupDownloadButton() {
    const downloadButton = document.getElementById("downloadExcelButton");

    if (downloadButton) {
        downloadButton.addEventListener("click", downloadExcel);
    }
}

// =====================================================
// LOCAL AUTO-SAVE (File System Access API — Edge/Chrome only)
// Lets the admin pick a folder on THIS PC once; after that,
// every successful dashboard refresh silently writes the
// latest clients.xlsx into that folder, no prompts needed.
// =====================================================

const AUTOSAVE_DB_NAME = "clientflow-autosave";
const AUTOSAVE_STORE_NAME = "handles";
const AUTOSAVE_KEY = "backendFolderHandle";

function openAutoSaveDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(AUTOSAVE_DB_NAME, 1);

        request.onupgradeneeded = () => {
            request.result.createObjectStore(AUTOSAVE_STORE_NAME);
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveFolderHandle(handle) {
    const db = await openAutoSaveDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(AUTOSAVE_STORE_NAME, "readwrite");
        tx.objectStore(AUTOSAVE_STORE_NAME).put(handle, AUTOSAVE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getFolderHandle() {
    const db = await openAutoSaveDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(AUTOSAVE_STORE_NAME, "readonly");
        const request = tx.objectStore(AUTOSAVE_STORE_NAME).get(AUTOSAVE_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

async function verifyFolderPermission(handle, requestIfNeeded) {
    const options = { mode: "readwrite" };

    if ((await handle.queryPermission(options)) === "granted") {
        return true;
    }

    if (requestIfNeeded) {
        if ((await handle.requestPermission(options)) === "granted") {
            return true;
        }
    }

    return false;
}

function updateAutoSaveButton(isOn) {
    const button = document.getElementById("autoSaveButton");

    if (!button) {
        return;
    }

    if (isOn) {
        button.textContent = "📁 Auto-Save: ON";
        button.classList.add("is-on");
    } else {
        button.textContent = "📁 Enable Auto-Save";
        button.classList.remove("is-on");
    }
}

async function chooseAutoSaveFolder() {

    if (!window.showDirectoryPicker) {
        alert("Local Auto-Save needs Chrome or Edge browser on desktop.");
        return;
    }

    try {
        const handle = await window.showDirectoryPicker({
            id: "clientflow-backend-folder",
            startIn: "documents"
        });

        const granted = await verifyFolderPermission(handle, true);

        if (!granted) {
            alert("Permission denied. Auto-Save was not enabled.");
            return;
        }

        await saveFolderHandle(handle);
        updateAutoSaveButton(true);

        // Save immediately so the folder gets today's data right away
        await autoSaveExcelToFolder();

        alert("Auto-Save enabled! clients.xlsx will update in that folder every time the dashboard refreshes.");

    } catch (error) {
        // User cancelled the picker — do nothing
        console.log("Folder selection cancelled or failed:", error);
    }
}

async function autoSaveExcelToFolder() {

    if (!window.showDirectoryPicker) {
        return;
    }

    try {
        const handle = await getFolderHandle();

        if (!handle) {
            updateAutoSaveButton(false);
            return;
        }

        const granted = await verifyFolderPermission(handle, false);

        if (!granted) {
            updateAutoSaveButton(false);
            return;
        }

        updateAutoSaveButton(true);

        const response = await fetch(`${API_BASE_URL}/download-excel`);

        if (!response.ok) {
            return;
        }

        const blob = await response.blob();

        const fileHandle = await handle.getFileHandle("clients.xlsx", { create: true });
        const writable = await fileHandle.createWritable();

        await writable.write(blob);
        await writable.close();

        console.log("Auto-saved clients.xlsx to local folder.");

    } catch (error) {
        console.error("Auto-save failed:", error);
    }
}

function setupAutoSaveButton() {
    const button = document.getElementById("autoSaveButton");

    if (button) {
        button.addEventListener("click", chooseAutoSaveFolder);
    }

    // Reflect current state on page load (silent check, no prompt)
    getFolderHandle().then(handle => {
        if (handle) {
            verifyFolderPermission(handle, false).then(updateAutoSaveButton);
        }
    });
}

// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    loadClients();
    setupSearch();
    setupRefreshButtons();
    setupDownloadButton();
    setupAutoSaveButton();

    // Auto-refresh dashboard (and auto-save) every 60 seconds
    setInterval(loadClients, 60000);
});