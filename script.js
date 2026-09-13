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
const firebaseConfig = {
  apiKey: "AIzaSyDqDKiX2fPyU81XpOCVPTYeFCn7-WkgmoY",
  authDomain: "smart-waste-management-49d88.firebaseapp.com",
  databaseURL: "https://smart-waste-management-49d88-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-waste-management-49d88",
  storageBucket: "smart-waste-management-49d88.firebasestorage.app",
  messagingSenderId: "459528260282",
  appId: "1:459528260282:web:d7161b9ec227621c3c1083"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
let bins = [];
const binsRef = database.ref("bins");

binsRef.on("value", (snapshot) => {
    const data = snapshot.val() || {};

    bins = Object.values(data);

    renderAll();
});

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
    dashboard: { title: "Operations Command Center",     subtitle: "Real-time ultrasonic telemetry, IoT fleet monitoring, and dynamic collection dispatch" },
    bins:      { title: "Smart Bins & Hardware Nodes",   subtitle: "Live ultrasonic sensor telemetry, fill diagnostics, and hardware health" },
    route:     { title: "Intelligent Route Dispatch",     subtitle: "Autonomous priority sequencing and dynamic logistics optimization" },
    history:   { title: "Collection Audit Log",           subtitle: "Historical collection records, response telemetry, and fleet performance" },
    analytics: { title: "Analytics & AI Forecasting",     subtitle: "Campus waste velocity metrics, fill distribution, and neural predictions" },
    settings:  { title: "System Architecture & Config",   subtitle: "Sensor thresholds, notification rules, and Firebase cloud integration" },
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
 * animateCounter — Animates numeric values counting up smoothly using ease-out cubic.
 * @param {string} elemId — Element ID to update
 * @param {number} targetValue — Target integer
 * @param {number} duration — Animation duration in ms (~800ms)
 * @param {boolean} forceFromZero — Whether to force start from 0
 */
function animateCounter(elemId, targetValue, duration = 800, forceFromZero = false) {
    const el = document.getElementById(elemId);
    if (!el) return;

    const startValue = forceFromZero ? 0 : (parseInt(el.textContent, 10) || 0);
    if (startValue === targetValue && !forceFromZero) {
        el.textContent = targetValue;
        return;
    }

    const startTime = performance.now();

    function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic: 1 - (1 - progress)^3
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + (targetValue - startValue) * ease);
        el.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            el.textContent = targetValue;
        }
    }

    requestAnimationFrame(frame);
}

/**
 * updateSummary — Updates the four summary cards at the top with animated counters & progress rings.
 * @param {boolean} forceFromZero — If true, animates numbers from 0 up to target (~800ms)
 */
function updateSummary(forceFromZero = false) {
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

    const totalCount = bins.length;
    const normalCount = normal + medium;
    const warningCount = nearlyFull;
    const criticalCount = critical;

    animateCounter('totalBins', totalCount, 800, forceFromZero);
    animateCounter('normalBins', normalCount, 800, forceFromZero);
    animateCounter('nearlyFullBins', warningCount, 800, forceFromZero);
    animateCounter('criticalBins', criticalCount, 800, forceFromZero);

    // Update normal radial progress ring dynamically
    const normalRing = document.getElementById('normalRingProgress');
    if (normalRing && totalCount > 0) {
        const pct = normalCount / totalCount;
        // Total ring circumference = 2 * PI * 14 ~= 88
        const offset = Math.max(0, Math.round(88 * (1 - pct)));
        normalRing.style.strokeDashoffset = offset;
    }
}

/**
 * buildBinCardsHTML — Returns HTML string for bin cards.
 * Shared by both Dashboard and Bins page.
 */
function buildBinCardsHTML(binsToRender) {
    if (binsToRender.length === 0) {
        return '<div class="no-results"><i class="bx bx-search-alt"></i><p>No bins match your current filter or search query.</p></div>';
    }

    return binsToRender.map(bin => {
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id.replace("BIN-", "");
        // Calculated ultrasonic distance estimate: 100cm max bin depth
        const approxDistanceCm = Math.round(100 - (bin.fillLevel * 0.9));

        return `
            <div class="bin-card status-${status.className}" 
                 onclick="showBinDetails('${bin.id}')"
                 title="Inspect device telemetry for ${bin.id}">
                <div class="bin-card-top">
                    <div class="bin-id-block">
                        <span class="bin-sensor-tag"><i class='bx bx-chip'></i> ${bin.sensorId}</span>
                        <h3>Bin ${binNumber}</h3>
                    </div>
                    <span class="status-badge ${status.className}">
                        <span class="badge-dot"></span>
                        ${status.label}
                    </span>
                </div>
                <div class="bin-card-location">
                    <i class='bx bx-map-pin'></i>
                    <span>${bin.location}</span>
                </div>
                <div class="bin-card-meter">
                    <div class="fill-bar">
                        <div class="fill-progress ${status.className}" 
                             style="width: ${bin.fillLevel}%"></div>
                    </div>
                    <div class="fill-text">
                        <span class="fill-lbl"><i class='bx bx-ruler'></i> ~${approxDistanceCm} cm to sensor</span>
                        <span class="percent">${bin.fillLevel}%</span>
                    </div>
                </div>
                <div class="bin-card-footer">
                    <span class="bin-ping"><i class='bx bx-radar'></i> ${bin.lastUpdated}</span>
                    <button class="bin-action-btn" onclick="event.stopPropagation(); showBinDetails('${bin.id}')">
                        Inspect <i class='bx bx-chevron-right'></i>
                    </button>
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
 * renderAlerts — Action-Oriented Operations Alert Center for bins ≥ 80%.
 */
function renderAlerts() {
    const container = document.getElementById('alertsContainer');

    const alertBins = bins
        .filter(bin => bin.fillLevel >= 80)
        .sort((a, b) => b.fillLevel - a.fillLevel);

    if (alertBins.length === 0) {
        container.innerHTML = `
            <div class="no-alerts">
                <div class="no-alerts-icon"><i class="bx bx-check-shield"></i></div>
                <div class="no-alerts-content">
                    <h4>All Campus Bins Within Safe Operating Thresholds</h4>
                    <p>No critical fill alerts detected. Telemetry mesh continuous monitoring active.</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = alertBins.map(bin => {
        const isCritical = bin.fillLevel >= 90;
        const binNumber = bin.id.replace("BIN-", "");

        return `
            <div class="alert-item ${isCritical ? 'critical' : 'warning'}" onclick="showBinDetails('${bin.id}')" title="Inspect Bin ${binNumber}">
                <div class="alert-badge-col">
                    <span class="alert-status-pill ${isCritical ? 'critical' : 'warning'}">
                        <span class="alert-pulse-ring"></span>
                        ${isCritical ? 'CRITICAL DISPATCH' : 'CAPACITY WARNING'}
                    </span>
                    <span class="alert-timestamp"><i class='bx bx-time'></i> ${bin.lastUpdated}</span>
                </div>
                <div class="alert-info-col">
                    <div class="alert-title-row">
                        <strong>Bin ${binNumber}</strong>
                        <span class="alert-location-tag"><i class='bx bx-map-pin'></i> ${bin.location}</span>
                    </div>
                    <p class="alert-desc">
                        ${isCritical 
                            ? 'Fill level has exceeded 90% threshold. Immediate collection dispatch recommended to prevent overflow.' 
                            : 'Fill level has exceeded 80% threshold. Schedule for next logistics dispatch loop.'}
                    </p>
                </div>
                <div class="alert-action-col">
                    <div class="alert-capacity-metric ${isCritical ? 'critical' : 'warning'}">
                        <span class="metric-num">${bin.fillLevel}%</span>
                        <span class="metric-sub">CAPACITY</span>
                    </div>
                    <button class="alert-dispatch-btn" onclick="event.stopPropagation(); showBinDetails('${bin.id}')">
                        Inspect Bin <i class='bx bx-right-arrow-alt'></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * buildRouteHTML — Returns HTML for intelligent visual logistics sequence.
 * Shared by Dashboard and Route page.
 */
function buildRouteHTML() {
    const routeBins = bins
        .filter(bin => bin.fillLevel >= 50)
        .sort((a, b) => b.fillLevel - a.fillLevel);

    let html = `
        <div class="route-node-item depot">
            <div class="route-timeline-marker">
                <span class="marker-icon"><i class='bx bxs-institution'></i></span>
                <span class="marker-connector"></span>
            </div>
            <div class="route-node-card depot">
                <div class="route-node-header">
                    <span class="route-badge depot">ORIGIN</span>
                    <strong>Central Fleet Depot</strong>
                </div>
                <p class="route-node-desc">Collection vehicle dispatch &amp; route departure</p>
            </div>
        </div>
    `;

    routeBins.forEach((bin, idx) => {
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id.replace("BIN-", "");
        html += `
            <div class="route-node-item ${status.className}" onclick="showBinDetails('${bin.id}')" title="Inspect Bin ${binNumber}">
                <div class="route-timeline-marker">
                    <span class="marker-icon ${status.className}">${idx + 1}</span>
                    <span class="marker-connector"></span>
                </div>
                <div class="route-node-card ${status.className}">
                    <div class="route-node-header">
                        <div class="route-bin-ident">
                            <strong>Bin ${binNumber}</strong>
                            <span class="route-loc"><i class='bx bx-map-pin'></i> ${bin.location}</span>
                        </div>
                        <span class="route-fill-pill ${status.className}">${bin.fillLevel}%</span>
                    </div>
                    <div class="route-node-footer">
                        <span class="route-priority ${status.className}">
                            <i class='bx bx-flag'></i> Priority ${status.priority}
                        </span>
                        <span class="route-inspect-hint">Inspect <i class='bx bx-chevron-right'></i></span>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
        <div class="route-node-item depot">
            <div class="route-timeline-marker">
                <span class="marker-icon"><i class='bx bxs-flag-checkered'></i></span>
            </div>
            <div class="route-node-card depot">
                <div class="route-node-header">
                    <span class="route-badge depot">DESTINATION</span>
                    <strong>Central Fleet Depot</strong>
                </div>
                <p class="route-node-desc">Waste unload, compaction &amp; fleet return-to-base</p>
            </div>
        </div>
    `;

    return { html, stopCount: routeBins.length, criticalCount: routeBins.filter(b => b.fillLevel >= 90).length };
}

/**
 * generateRoute — Renders route on the Dashboard page if container exists.
 */
function generateRoute() {
    const el = document.getElementById('routeContainer');
    if (!el) return;
    const { html } = buildRouteHTML();
    el.innerHTML = html;
}

/**
 * renderRoutePage — Renders route on the dedicated Route page if present.
 */
function renderRoutePage() {
    const el = document.getElementById('routeContainerPage');
    if (!el) return;
    const { html, stopCount, criticalCount } = buildRouteHTML();
    el.innerHTML = html;

    const stopsEl = document.getElementById('routeStops');
    if (stopsEl) stopsEl.textContent = stopCount;
    const critEl = document.getElementById('routeCritical');
    if (critEl) critEl.textContent = criticalCount;
    const etaEl = document.getElementById('routeETA');
    if (etaEl) etaEl.textContent = `~${stopCount * 5 + 10} min`;
    const distEl = document.getElementById('routeDistance');
    if (distEl) distEl.textContent = `~${(stopCount * 0.8 + 1).toFixed(1)} km`;
}

/**
 * renderMapMarkersIn — Places bin markers on the CSS campus map.
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
        marker.className = `map-marker status-${status.className}`;
        marker.style.top = `${bin.lat}%`;
        marker.style.left = `${bin.lng}%`;
        marker.title = `${bin.id} — ${bin.location} (${bin.fillLevel}%)`;
        marker.onclick = () => showBinDetails(bin.id);

        marker.innerHTML = `
            <div class="marker-beacon ${status.className}">
                <span class="beacon-wave"></span>
                <span class="beacon-center"><i class='bx bxs-trash'></i></span>
            </div>
            <div class="marker-tag">
                <span class="tag-id">Bin ${binNumber}</span>
                <span class="tag-fill ${status.className}">${bin.fillLevel}%</span>
            </div>
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
    // Header desktop button (icon-only ghost button)
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.innerHTML = isDark
            ? "<i class='bx bx-sun'></i>"
            : "<i class='bx bx-moon'></i>";
        themeBtn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
        themeBtn.setAttribute('aria-label', isDark ? "Switch to light mode" : "Switch to dark mode");
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

    // Default to dark theme for modern 2026 AI/IoT command center aesthetic
    let isDark = true;
    if (savedTheme === 'light') {
        isDark = false;
    } else if (savedTheme === 'dark') {
        isDark = true;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        // If user explicitly has OS light mode and no saved setting, can still default or respect
        isDark = false;
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
 * @param {boolean} forceCountAnimation — Whether to animate counters from 0 and re-trigger entrance
 */
function renderAll(forceCountAnimation = false) {
    updateDateTime();
    updateSummary(forceCountAnimation);
    renderBins(bins);
    renderAlerts();
    generateRoute();
    renderMapMarkers();
    renderChart();

    if (forceCountAnimation) {
        // Re-trigger staggered animation on summary cards
        document.querySelectorAll('.summary-card').forEach(card => {
            card.style.animation = 'none';
            void card.offsetHeight; // trigger reflow
            card.style.animation = '';
        });
    }

    // If we're currently on another page, re-render that too
    if (currentPage !== 'dashboard') {
        navigateToPage(currentPage);
    }
}


/* ============================================================
   6. INITIALIZATION — Runs when the page loads
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── Render the dashboard (with counting animations) ──
    renderAll(true);

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

        renderAll(true);

        const icon = document.querySelector('.btn-refresh i');
        if (icon) {
            icon.style.transform = 'rotate(360deg)';
            setTimeout(() => { icon.style.transform = 'rotate(0deg)'; }, 500);
        }
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
