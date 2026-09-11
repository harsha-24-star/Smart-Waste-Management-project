/* ============================================================
   SMART WASTE MANAGEMENT DASHBOARD — JAVASCRIPT
   
   This file contains ALL the logic for the dashboard.
   
   ── STRUCTURE ──
   1. MOCK DATA          — Sample bin data (replace with Firebase later)
   2. UTILITY FUNCTIONS  — Status helpers, date formatting
   3. RENDER FUNCTIONS   — Build the HTML for each section
   4. PAGE NAVIGATION    — Show/hide pages when sidebar links are clicked
   5. INTERACTION        — Search, filter, modal, sidebar, refresh
   6. INITIALIZATION     — Start everything when page loads
   
   ── FUTURE FIREBASE INTEGRATION ──
   When you connect Firebase, you will:
   1. Replace the `bins` array with a Firebase Realtime Database listener.
   2. In the listener callback, call the same render functions.
   3. Everything else stays the same!
   
   Data flow (future):
     ESP32 + Ultrasonic Sensor → Firebase Realtime DB → This Dashboard
   ============================================================ */


/* ============================================================
   1. MOCK DATA
   ──────────────────────────────────────────────────────────────
   This is the ONLY place where sample data lives.
   Later, replace this array with data coming from Firebase.
   
   Each bin object has:
   - id          : Unique bin identifier (e.g., "BIN-01")
   - location    : Where the bin is placed on campus
   - fillLevel   : Current fill percentage (0–100)
   - lastUpdated : When the sensor last reported
   - lat / lng   : Placeholder coordinates for the map
   - sensorId    : The ESP32 sensor identifier
   ============================================================ */

const bins = [
    {
        id: "BIN-01",
        location: "Main Block",
        fillLevel: 25,
        lastUpdated: "2 minutes ago",
        lat: 25,
        lng: 20,
        sensorId: "ESP32-001"
    },
    {
        id: "BIN-02",
        location: "Canteen",
        fillLevel: 90,
        lastUpdated: "1 minute ago",
        lat: 35,
        lng: 55,
        sensorId: "ESP32-002"
    },
    {
        id: "BIN-03",
        location: "Library",
        fillLevel: 60,
        lastUpdated: "3 minutes ago",
        lat: 55,
        lng: 30,
        sensorId: "ESP32-003"
    },
    {
        id: "BIN-04",
        location: "Hostel A",
        fillLevel: 45,
        lastUpdated: "5 minutes ago",
        lat: 70,
        lng: 15,
        sensorId: "ESP32-004"
    },
    {
        id: "BIN-05",
        location: "Parking Area",
        fillLevel: 82,
        lastUpdated: "1 minute ago",
        lat: 30,
        lng: 80,
        sensorId: "ESP32-005"
    },
    {
        id: "BIN-06",
        location: "Hostel B",
        fillLevel: 95,
        lastUpdated: "30 seconds ago",
        lat: 75,
        lng: 75,
        sensorId: "ESP32-006"
    },
    {
        id: "BIN-07",
        location: "Sports Ground",
        fillLevel: 30,
        lastUpdated: "4 minutes ago",
        lat: 85,
        lng: 45,
        sensorId: "ESP32-007"
    },
    {
        id: "BIN-08",
        location: "Auditorium",
        fillLevel: 72,
        lastUpdated: "2 minutes ago",
        lat: 50,
        lng: 60,
        sensorId: "ESP32-008"
    },
    {
        id: "BIN-09",
        location: "Admin Office",
        fillLevel: 15,
        lastUpdated: "6 minutes ago",
        lat: 20,
        lng: 42,
        sensorId: "ESP32-009"
    },
    {
        id: "BIN-10",
        location: "Workshop",
        fillLevel: 55,
        lastUpdated: "3 minutes ago",
        lat: 60,
        lng: 88,
        sensorId: "ESP32-010"
    },
    {
        id: "BIN-11",
        location: "Gate Entrance",
        fillLevel: 40,
        lastUpdated: "7 minutes ago",
        lat: 10,
        lng: 50,
        sensorId: "ESP32-011"
    },
    {
        id: "BIN-12",
        location: "Seminar Hall",
        fillLevel: 68,
        lastUpdated: "4 minutes ago",
        lat: 45,
        lng: 35,
        sensorId: "ESP32-012"
    }
    // ─── FUTURE: Firebase Integration ───
    // When Firebase is connected, remove this array and instead
    // listen for real-time updates:
    //
    // import { getDatabase, ref, onValue } from "firebase/database";
    // const db = getDatabase();
    // const binsRef = ref(db, "bins");
    // onValue(binsRef, (snapshot) => {
    //     const data = snapshot.val();
    //     bins = Object.values(data);
    //     renderAll();
    // });
];


/* ============================================================
   1b. MOCK COLLECTION HISTORY DATA
   ──────────────────────────────────────────────────────────────
   Sample past collections for the History page.
   ============================================================ */

const collectionHistory = [
    { date: "Sep 12, 2026 — 08:30 AM", binId: "BIN-06", location: "Hostel B",      fillAtCollection: 97, collectedBy: "Worker A", type: "emergency" },
    { date: "Sep 12, 2026 — 08:15 AM", binId: "BIN-02", location: "Canteen",       fillAtCollection: 92, collectedBy: "Worker A", type: "emergency" },
    { date: "Sep 11, 2026 — 06:00 PM", binId: "BIN-05", location: "Parking Area",  fillAtCollection: 85, collectedBy: "Worker B", type: "completed" },
    { date: "Sep 11, 2026 — 05:30 PM", binId: "BIN-08", location: "Auditorium",    fillAtCollection: 78, collectedBy: "Worker B", type: "completed" },
    { date: "Sep 11, 2026 — 02:00 PM", binId: "BIN-03", location: "Library",       fillAtCollection: 74, collectedBy: "Worker A", type: "completed" },
    { date: "Sep 11, 2026 — 09:00 AM", binId: "BIN-10", location: "Workshop",      fillAtCollection: 70, collectedBy: "Worker C", type: "completed" },
    { date: "Sep 10, 2026 — 07:00 PM", binId: "BIN-06", location: "Hostel B",      fillAtCollection: 95, collectedBy: "Worker A", type: "emergency" },
    { date: "Sep 10, 2026 — 06:00 PM", binId: "BIN-12", location: "Seminar Hall",  fillAtCollection: 72, collectedBy: "Worker B", type: "completed" },
    { date: "Sep 10, 2026 — 10:00 AM", binId: "BIN-01", location: "Main Block",    fillAtCollection: 65, collectedBy: "Worker C", type: "completed" },
    { date: "Sep 09, 2026 — 04:00 PM", binId: "BIN-04", location: "Hostel A",      fillAtCollection: 60, collectedBy: "Worker A", type: "completed" },
    { date: "Sep 09, 2026 — 11:00 AM", binId: "BIN-07", location: "Sports Ground", fillAtCollection: 55, collectedBy: "Worker B", type: "completed" },
    { date: "Sep 09, 2026 — 08:00 AM", binId: "BIN-02", location: "Canteen",       fillAtCollection: 88, collectedBy: "Worker A", type: "completed" },
];


/* ============================================================
   1c. PAGE TITLES & SUBTITLES
   ──────────────────────────────────────────────────────────────
   Each page has its own header title and subtitle.
   ============================================================ */

const pageTitles = {
    dashboard: { title: "Dashboard",                           subtitle: "Monitor bin levels and optimize waste collection" },
    bins:      { title: "Bin Management",                     subtitle: "View and manage all waste bins across campus" },
    route:     { title: "Collection Route",                   subtitle: "Today's optimized waste collection route" },
    history:   { title: "Collection History",                 subtitle: "Past collection records and performance metrics" },
    analytics: { title: "Analytics & Insights",               subtitle: "Data visualization and AI predictions" },
    settings:  { title: "Settings",                           subtitle: "System configuration and preferences" },
};


/* ============================================================
   2. UTILITY FUNCTIONS
   ============================================================ */

/**
 * getBinStatus — Determines the status label and CSS class
 *                based on the bin's fill percentage.
 *
 * Rules:
 *   0–49%   → "Normal"
 *   50–79%  → "Medium"
 *   80–89%  → "Nearly Full"
 *   90–100% → "Critical"
 *
 * @param {number} fillLevel - Fill percentage (0-100)
 * @returns {object} { label, className, priority }
 */
function getBinStatus(fillLevel) {
    if (fillLevel >= 90) {
        return { label: "Critical",    className: "critical",    priority: "HIGH" };
    } else if (fillLevel >= 80) {
        return { label: "Nearly Full", className: "nearly-full", priority: "MEDIUM" };
    } else if (fillLevel >= 50) {
        return { label: "Medium",      className: "medium",      priority: "LOW" };
    } else {
        return { label: "Normal",      className: "normal",      priority: "NONE" };
    }
}

/**
 * formatDate — Returns a nicely formatted date string.
 */
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * formatTime — Returns a time string like "12:45:30 AM"
 */
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}


/* ============================================================
   3. RENDER FUNCTIONS
   ──────────────────────────────────────────────────────────────
   Each function takes the bins data and builds the HTML for
   one section of the dashboard.
   ============================================================ */

/**
 * updateSummary — Updates the four summary cards at the top.
 */
function updateSummary() {
    let normal = 0, medium = 0, nearlyFull = 0, critical = 0;

    bins.forEach(bin => {
        const status = getBinStatus(bin.fillLevel);
        switch (status.className) {
            case "normal":      normal++;      break;
            case "medium":      medium++;      break;
            case "nearly-full": nearlyFull++;  break;
            case "critical":    critical++;    break;
        }
    });

    document.getElementById('totalBins').textContent       = bins.length;
    document.getElementById('normalBins').textContent      = normal + medium;
    document.getElementById('nearlyFullBins').textContent   = nearlyFull;
    document.getElementById('criticalBins').textContent    = critical;
}

/**
 * buildBinCardsHTML — Returns HTML string for bin cards.
 * Shared by both Dashboard and Bins page.
 */
function buildBinCardsHTML(binsToRender) {
    if (binsToRender.length === 0) {
        return '<div class="no-results">No bins match your search or filter.</div>';
    }

    return binsToRender.map(bin => {
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id.replace("BIN-", "");

        return `
            <div class="bin-card status-${status.className}" 
                 onclick="showBinDetails('${bin.id}')"
                 title="Click for details">
                <div class="bin-card-header">
                    <h3>Bin ${binNumber}</h3>
                    <span class="status-badge ${status.className}">${status.label}</span>
                </div>
                <p class="location"><i class='bx bx-map'></i> ${bin.location}</p>
                <div class="fill-bar">
                    <div class="fill-progress ${status.className}" 
                         style="width: ${bin.fillLevel}%"></div>
                </div>
                <div class="fill-text">
                    <span>Fill Level</span>
                    <span class="percent">${bin.fillLevel}%</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * renderBins — Renders bin cards into the Dashboard grid.
 */
function renderBins(binsToRender) {
    document.getElementById('binsGrid').innerHTML = buildBinCardsHTML(binsToRender);
}

/**
 * renderBinsPage — Renders bin cards into the Bins page grid.
 */
function renderBinsPage(binsToRender) {
    document.getElementById('binsGridPage').innerHTML = buildBinCardsHTML(binsToRender);
    document.getElementById('binsPageCount').textContent = binsToRender.length;
}

/**
 * renderAlerts — Shows alerts for bins ≥ 80%.
 */
function renderAlerts() {
    const container = document.getElementById('alertsContainer');

    const alertBins = bins
        .filter(bin => bin.fillLevel >= 80)
        .sort((a, b) => b.fillLevel - a.fillLevel);

    if (alertBins.length === 0) {
        container.innerHTML = '<div class="no-alerts"><i class="bx bx-check-circle" style="font-size:1.5rem;color:var(--status-normal)"></i><p>All bins are at safe levels. No alerts.</p></div>';
        return;
    }

    container.innerHTML = alertBins.map(bin => {
        const isCritical = bin.fillLevel >= 90;
        const binNumber = bin.id.replace("BIN-", "");

        return `
            <div class="alert-item ${isCritical ? '' : 'warning'}">
                <div class="alert-icon">
                    <i class='bx ${isCritical ? 'bxs-error-circle' : 'bxs-error'}'></i>
                </div>
                <div class="alert-text">
                    <strong>Bin ${binNumber}</strong> (${bin.location}) is 
                    <strong>${bin.fillLevel}%</strong> full — 
                    ${isCritical ? 'Immediate collection required!' : 'Needs attention soon.'}
                </div>
                <span class="alert-time">${bin.lastUpdated}</span>
            </div>
        `;
    }).join('');
}

/**
 * buildRouteHTML — Returns HTML for the collection route.
 * Shared by Dashboard and Route page.
 */
function buildRouteHTML() {
    const routeBins = bins
        .filter(bin => bin.fillLevel >= 50)
        .sort((a, b) => b.fillLevel - a.fillLevel);

    let html = `
        <div class="route-step depot">
            <div class="route-dot"></div>
            <div class="route-info">
                <strong>🏢 Depot</strong> — Start collection
            </div>
        </div>
    `;

    routeBins.forEach(bin => {
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id.replace("BIN-", "");
        html += `
            <div class="route-step ${status.className}">
                <div class="route-dot"></div>
                <div class="route-info">
                    <strong>Bin ${binNumber}</strong> — ${bin.location} 
                    <span class="route-fill" style="color: var(--status-${
                        status.className === 'nearly-full' ? 'warning' : status.className
                    })">${bin.fillLevel}%</span>
                </div>
            </div>
        `;
    });

    html += `
        <div class="route-step depot">
            <div class="route-dot"></div>
            <div class="route-info">
                <strong>🏢 Depot</strong> — Return to base
            </div>
        </div>
    `;

    return { html, stopCount: routeBins.length, criticalCount: routeBins.filter(b => b.fillLevel >= 90).length };
}

/**
 * generateRoute — Renders route on the Dashboard page.
 */
function generateRoute() {
    const { html } = buildRouteHTML();
    document.getElementById('routeContainer').innerHTML = html;
}

/**
 * renderRoutePage — Renders route on the dedicated Route page
 * along with route statistics.
 */
function renderRoutePage() {
    const { html, stopCount, criticalCount } = buildRouteHTML();
    document.getElementById('routeContainerPage').innerHTML = html;

    // Update route stats
    document.getElementById('routeStops').textContent = stopCount;
    document.getElementById('routeCritical').textContent = criticalCount;
    document.getElementById('routeETA').textContent = `~${stopCount * 5 + 10} min`;
    document.getElementById('routeDistance').textContent = `~${(stopCount * 0.8 + 1).toFixed(1)} km`;
}

/**
 * renderMapMarkers — Places bin markers on the CSS campus map.
 * @param {string} mapBgSelector — CSS selector for the map background div.
 */
function renderMapMarkersIn(mapBgSelector) {
    const mapBg = document.querySelector(mapBgSelector);
    if (!mapBg) return;

    // Remove old markers
    mapBg.querySelectorAll('.map-marker').forEach(m => m.remove());

    bins.forEach(bin => {
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id.replace("BIN-", "");

        const marker = document.createElement('div');
        marker.className = 'map-marker';
        marker.style.top = `${bin.lat}%`;
        marker.style.left = `${bin.lng}%`;
        marker.title = `${bin.id} — ${bin.location} (${bin.fillLevel}%)`;
        marker.onclick = () => showBinDetails(bin.id);

        marker.innerHTML = `
            <div class="marker-pin ${status.className}">
                <i class='bx bxs-trash'></i>
            </div>
            <span class="marker-label">Bin ${binNumber}</span>
        `;

        mapBg.appendChild(marker);
    });
}

/**
 * renderMapMarkers — Places markers on the Dashboard map.
 */
function renderMapMarkers() {
    renderMapMarkersIn('#mapPlaceholder .map-bg');
}

/**
 * renderMapMarkersPage — Places markers on the Route page map.
 */
function renderMapMarkersPage() {
    renderMapMarkersIn('#mapPlaceholderPage .map-bg-page');
}

/**
 * renderChart — Builds a horizontal bar chart.
 * @param {string} containerId — The container element ID.
 */
function renderChartIn(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = bins.map(bin => {
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id.replace("BIN-", "");

        return `
            <div class="chart-bar-row">
                <span class="chart-label">Bin ${binNumber}</span>
                <div class="chart-bar">
                    <div class="chart-fill ${status.className}" 
                         style="width: ${bin.fillLevel}%">
                        ${bin.fillLevel}%
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * renderChart — Renders chart on Dashboard page.
 */
function renderChart() {
    renderChartIn('chartContainer');
}

/**
 * renderHistoryPage — Populates the collection history table.
 */
function renderHistoryPage() {
    const tbody = document.getElementById('historyBody');
    if (!tbody) return;

    tbody.innerHTML = collectionHistory.map(record => {
        const statusClass = record.type === 'emergency' ? 'emergency' : 'completed';
        const statusLabel = record.type === 'emergency' ? 'Emergency' : 'Completed';

        return `
            <tr>
                <td>${record.date}</td>
                <td><strong>${record.binId}</strong></td>
                <td>${record.location}</td>
                <td><strong>${record.fillAtCollection}%</strong></td>
                <td>${record.collectedBy}</td>
                <td><span class="table-status ${statusClass}">${statusLabel}</span></td>
            </tr>
        `;
    }).join('');
}

/**
 * renderAnalyticsPage — Renders the Analytics page charts
 * and status distribution.
 */
function renderAnalyticsPage() {
    // Fill levels chart
    renderChartIn('chartContainerAnalytics');

    // Status distribution
    let normal = 0, medium = 0, nearlyFull = 0, critical = 0;

    bins.forEach(bin => {
        const status = getBinStatus(bin.fillLevel);
        switch (status.className) {
            case "normal":      normal++;      break;
            case "medium":      medium++;      break;
            case "nearly-full": nearlyFull++;  break;
            case "critical":    critical++;    break;
        }
    });

    const total = bins.length;

    // Update distribution bars (height as percentage of total)
    document.getElementById('distNormal').style.height  = `${(normal / total) * 100}%`;
    document.getElementById('distMedium').style.height  = `${(medium / total) * 100}%`;
    document.getElementById('distWarning').style.height = `${(nearlyFull / total) * 100}%`;
    document.getElementById('distCritical').style.height = `${(critical / total) * 100}%`;

    // Update counts
    document.getElementById('distNormalVal').textContent  = normal;
    document.getElementById('distMediumVal').textContent  = medium;
    document.getElementById('distWarningVal').textContent = nearlyFull;
    document.getElementById('distCriticalVal').textContent = critical;
}

/**
 * renderSettingsPage — Updates dynamic values on the Settings page.
 */
function renderSettingsPage() {
    const sensorsEl = document.getElementById('sensorsOnline');
    if (sensorsEl) {
        sensorsEl.textContent = `${bins.length} / ${bins.length}`;
    }

    const settingsToggle = document.getElementById('settingsDarkModeToggle');
    const isDark = document.body.classList.contains('dark-theme');
    if (settingsToggle) {
        settingsToggle.checked = isDark;
    }
    const currentThemeLabel = document.getElementById('currentThemeLabel');
    if (currentThemeLabel) {
        currentThemeLabel.textContent = isDark ? 'Dark' : 'Light';
    }
}

/* ============================================================
   THEME MANAGEMENT (Dark Mode)
   ============================================================ */

/**
 * updateThemeUI — Synchronizes all theme buttons and icons.
 */
function updateThemeUI(isDark) {
    // Header desktop button
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.innerHTML = isDark
            ? "<i class='bx bx-sun'></i><span class='theme-text'>Light</span>"
            : "<i class='bx bx-moon'></i><span class='theme-text'>Dark</span>";
    }

    // Mobile header button
    const mobileThemeBtn = document.getElementById('mobileThemeToggle');
    if (mobileThemeBtn) {
        mobileThemeBtn.innerHTML = isDark
            ? "<i class='bx bx-sun'></i>"
            : "<i class='bx bx-moon'></i>";
    }

    // Settings page toggle & label
    const settingsToggle = document.getElementById('settingsDarkModeToggle');
    if (settingsToggle) {
        settingsToggle.checked = isDark;
    }
    const currentThemeLabel = document.getElementById('currentThemeLabel');
    if (currentThemeLabel) {
        currentThemeLabel.textContent = isDark ? 'Dark' : 'Light';
    }
}

/**
 * toggleTheme — Switches between light and dark themes.
 */
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    try {
        localStorage.setItem('swm-theme', isDark ? 'dark' : 'light');
    } catch (e) {
        // Local storage unavailable, gracefully continue
    }
    updateThemeUI(isDark);
}

/**
 * initTheme — Restores saved theme from localStorage or system preference.
 */
function initTheme() {
    let savedTheme = null;
    try {
        savedTheme = localStorage.getItem('swm-theme');
    } catch (e) {}

    let isDark = false;
    if (savedTheme) {
        isDark = savedTheme === 'dark';
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDark = true;
    }

    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    updateThemeUI(isDark);
}

/**
 * updateDateTime — Sets date and time in the header.
 */
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = formatDate(now);
    document.getElementById('lastUpdate').textContent  = formatTime(now);
}


/* ============================================================
   4. PAGE NAVIGATION
   ──────────────────────────────────────────────────────────────
   Shows/hides page sections when sidebar links are clicked.
   ============================================================ */

/** Currently active page name */
let currentPage = 'dashboard';

/**
 * navigateToPage — Switches the visible page.
 * @param {string} pageName — One of: dashboard, bins, route, history, analytics, settings
 */
function navigateToPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show the selected page
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update sidebar active link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });

    // Update header title and subtitle
    const pageInfo = pageTitles[pageName] || pageTitles.dashboard;
    document.getElementById('pageTitle').textContent    = pageInfo.title;
    document.getElementById('pageSubtitle').textContent = pageInfo.subtitle;

    // Render page-specific content when navigated to
    switch (pageName) {
        case 'bins':
            renderBinsPage(bins);
            break;
        case 'route':
            renderRoutePage();
            renderMapMarkersPage();
            break;
        case 'history':
            renderHistoryPage();
            break;
        case 'analytics':
            renderAnalyticsPage();
            break;
        case 'settings':
            renderSettingsPage();
            break;
    }

    currentPage = pageName;

    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ============================================================
   5. INTERACTION FUNCTIONS
   ============================================================ */

/**
 * getFilteredBins — Filters bins by status and search text.
 * Used by both Dashboard and Bins page.
 */
function getFilteredBins(filterType, searchText) {
    let filtered = bins;

    if (filterType !== 'all') {
        filtered = filtered.filter(bin => {
            const status = getBinStatus(bin.fillLevel);
            return status.className === filterType;
        });
    }

    if (searchText) {
        filtered = filtered.filter(bin =>
            bin.id.toLowerCase().includes(searchText) ||
            bin.location.toLowerCase().includes(searchText)
        );
    }

    return filtered;
}

/**
 * filterBins — Filters bins on the Dashboard page.
 */
function filterBins(filterType) {
    const searchText = document.getElementById('searchInput').value.toLowerCase().trim();
    renderBins(getFilteredBins(filterType, searchText));
}

/**
 * searchBins — Search handler for the Dashboard page.
 */
function searchBins() {
    const searchText = document.getElementById('searchInput').value.toLowerCase().trim();
    const activeFilter = document.querySelector('#page-dashboard .filter-btn.active');
    const filterType = activeFilter ? activeFilter.dataset.filter : 'all';
    renderBins(getFilteredBins(filterType, searchText));
}

/**
 * filterBinsPage — Filters bins on the Bins page.
 */
function filterBinsPage(filterType) {
    const searchText = document.getElementById('searchInputBins').value.toLowerCase().trim();
    renderBinsPage(getFilteredBins(filterType, searchText));
}

/**
 * searchBinsPage — Search handler for the Bins page.
 */
function searchBinsPage() {
    const searchText = document.getElementById('searchInputBins').value.toLowerCase().trim();
    const activeFilter = document.querySelector('#filterButtonsBins .filter-btn.active');
    const filterType = activeFilter ? activeFilter.dataset.filter : 'all';
    renderBinsPage(getFilteredBins(filterType, searchText));
}

/**
 * showBinDetails — Opens the modal with detailed bin info.
 */
function showBinDetails(binId) {
    const bin = bins.find(b => b.id === binId);
    if (!bin) return;

    const status = getBinStatus(bin.fillLevel);
    const binNumber = bin.id.replace("BIN-", "");

    document.getElementById('modalBinId').textContent       = `Bin ${binNumber}`;
    document.getElementById('modalLocation').textContent    = bin.location;
    document.getElementById('modalFillPercent').textContent  = `${bin.fillLevel}%`;
    document.getElementById('modalLastUpdated').textContent = bin.lastUpdated;
    document.getElementById('modalSensor').textContent      = bin.sensorId;

    const statusEl = document.getElementById('modalStatus');
    statusEl.textContent = status.label;
    statusEl.style.color = `var(--status-${
        status.className === 'nearly-full' ? 'warning' : status.className
    })`;

    const priorityEl = document.getElementById('modalPriority');
    priorityEl.textContent = status.priority;
    priorityEl.style.fontWeight = '700';
    if (status.priority === 'HIGH')        priorityEl.style.color = 'var(--status-critical)';
    else if (status.priority === 'MEDIUM') priorityEl.style.color = 'var(--status-warning)';
    else                                   priorityEl.style.color = 'var(--text)';

    const fillBar = document.getElementById('modalFillBar');
    fillBar.style.width = `${bin.fillLevel}%`;
    fillBar.className = `modal-fill-progress ${status.className}`;

    const header = document.getElementById('modalHeader');
    header.className = `modal-header ${status.className}`;

    document.getElementById('modalOverlay').classList.add('active');
}

/**
 * closeModal — Closes the bin details modal.
 */
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

/**
 * saveThresholds — Saves threshold settings and re-renders.
 * (In this prototype, values aren't persisted — this is a demo.)
 */
function saveThresholds() {
    // In a full app, you would update the getBinStatus function
    // with the new threshold values and persist to localStorage or Firebase.
    alert('Thresholds saved! (In this prototype, thresholds are demonstration-only. Full functionality will be added with Firebase.)');
}

/**
 * renderAll — Master function that re-renders the Dashboard page.
 */
function renderAll() {
    updateDateTime();
    updateSummary();
    renderBins(bins);
    renderAlerts();
    generateRoute();
    renderMapMarkers();
    renderChart();

    // If we're currently on another page, re-render that too
    if (currentPage !== 'dashboard') {
        navigateToPage(currentPage);
    }
}


/* ============================================================
   6. INITIALIZATION — Runs when the page loads
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── Render the dashboard ──
    renderAll();

    // ── SEARCH: Dashboard page ──
    document.getElementById('searchInput').addEventListener('input', searchBins);

    // ── SEARCH: Bins page ──
    document.getElementById('searchInputBins').addEventListener('input', searchBinsPage);

    // ── FILTER BUTTONS: Dashboard page ──
    document.querySelectorAll('#page-dashboard .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#page-dashboard .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterBins(btn.dataset.filter);
        });
    });

    // ── FILTER BUTTONS: Bins page ──
    document.querySelectorAll('#filterButtonsBins .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filterButtonsBins .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterBinsPage(btn.dataset.filter);
        });
    });

    // ── REFRESH BUTTON ──
    document.getElementById('btnRefresh').addEventListener('click', () => {
        // ─── FUTURE: Firebase refresh ───
        // const binsRef = ref(db, "bins");
        // get(binsRef).then((snapshot) => { ... });

        renderAll();

        const icon = document.querySelector('.btn-refresh i');
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => { icon.style.transform = 'rotate(0deg)'; }, 500);
    });

    // ── MODAL: Close handlers ──
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalOverlay')) {
            closeModal();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // ── SIDEBAR NAVIGATION ──
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.dataset.page;
            navigateToPage(pageName);
            closeSidebar();  // Close on mobile
        });
    });

    // ── MOBILE SIDEBAR TOGGLE ──
    const sidebar   = document.getElementById('sidebar');
    const overlay   = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburger');

    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    });

    overlay.addEventListener('click', closeSidebar);

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }

    // ── THEME (DARK MODE) INITIALIZATION & LISTENERS ──
    initTheme();

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    if (mobileThemeToggle) {
        mobileThemeToggle.addEventListener('click', toggleTheme);
    }

    const settingsDarkModeToggle = document.getElementById('settingsDarkModeToggle');
    if (settingsDarkModeToggle) {
        settingsDarkModeToggle.addEventListener('change', toggleTheme);
    }
});


/* ============================================================
   ── NOTES FOR FUTURE DEVELOPMENT ──
   
   1. FIREBASE INTEGRATION
      - Install Firebase SDK or use the CDN script tags.
      - Initialize Firebase with your project config.
      - Replace the `bins` array with a Realtime Database listener.
      - In the listener callback, call `renderAll()`.
      - The `btnRefresh` click handler should trigger a manual read.
   
   2. ESP32 SENSOR DATA
      - Each ESP32 reads the ultrasonic sensor distance.
      - It calculates fill percentage: 
        fillLevel = ((binHeight - distance) / binHeight) * 100
      - It writes this value to Firebase under: bins/{binId}/fillLevel
      - The dashboard picks it up automatically via the listener.
   
   3. GOOGLE MAPS INTEGRATION
      - Replace the CSS map placeholder with a real Google Map.
      - Use each bin's actual GPS coordinates (lat/lng).
      - Place markers with color-coded icons based on fill level.
   
   4. ROUTE OPTIMIZATION
      - Replace the simple sort-by-fill-level with a proper algorithm.
      - Options: Google Directions API, or a TSP solver library.
   
   5. AI/ML PREDICTION
      - Collect historical fill-level data over time.
      - Train a simple regression model to predict fill times.
      - Display predictions in the "AI Prediction" section.
   
   6. AUTHENTICATION
      - Add Firebase Authentication for admin/worker login.
      - Show different views based on user role.
   ============================================================ */
