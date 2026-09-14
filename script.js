/* ============================================================
   SMART WASTE MANAGEMENT PLATFORM — JAVASCRIPT LOGIC
   
   Architecture:
   1. FIREBASE REALTIME DATABASE — Live WebSocket connection & status
   2. DATA & UTILITIES           — Status helpers, formatting, counters
   3. RENDER WORKSPACES          — Dashboard, Bins, Route, AI, Analytics, History, Settings
   4. NAVIGATION                 — Dynamic page switching & header syncing
   5. MODAL & INTERACTION        — Bin inspection, search, filter, refresh
   6. INITIALIZATION             — Theme management & event listeners
   ============================================================ */

/* ============================================================
   1. FIREBASE REALTIME DATABASE CONFIGURATION & LISTENER
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

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.warn("Firebase already initialized or initial error:", e);
}

const database = firebase.database();
const binsRef = database.ref("bins");
const connectedRef = database.ref(".info/connected");

// Active fleet bin records (populated directly from Firebase Realtime Database)
let bins = [];
let firebaseSyncStatus = 'awaiting'; // 'awaiting' | 'synced' | 'error'

/**
 * updateFirebaseSyncUI — Reflects actual synchronization state across the interface.
 * States:
 *   - 'awaiting': ● Awaiting Cloud Sync
 *   - 'synced':   ● Live — Cloud Synced
 *   - 'error':    ● Connection Error
 */
function updateFirebaseSyncUI(state, customLabel = null) {
    firebaseSyncStatus = state;

    // Header badge
    const headerBadge = document.getElementById('headerConnectionBadge');
    if (headerBadge) {
        headerBadge.className = `telemetry-chip-tag ${state}`;
        if (state === 'synced') {
            headerBadge.innerHTML = `<i class='bx bx-check-shield'></i> Live — Cloud Synced`;
        } else if (state === 'error') {
            headerBadge.innerHTML = `<i class='bx bx-error-circle'></i> Connection Error`;
        } else {
            headerBadge.innerHTML = `<i class='bx bx-sync bx-spin'></i> Awaiting Cloud Sync`;
        }
    }

    // Sidebar status
    const sidebarDot = document.getElementById('sidebarStatusDot');
    const sidebarText = document.getElementById('sidebarStatusText');
    if (sidebarDot && sidebarText) {
        sidebarDot.className = `status-dot ${state}`;
        if (state === 'synced') {
            sidebarText.textContent = "Live — Cloud Synced";
        } else if (state === 'error') {
            sidebarText.textContent = "Connection Error";
        } else {
            sidebarText.textContent = "Awaiting Cloud Sync";
        }
    }

    // Bottom System Status Panel
    const statusPill = document.getElementById('firebaseStatusPill');
    const statusLabel = document.getElementById('firebaseStatusLabel');
    const statusDesc = document.getElementById('firebaseStatusDesc');
    const syncStateVal = document.getElementById('firebaseSyncStateVal');
    const settingsSyncState = document.getElementById('settingsSyncState');

    if (statusPill && statusLabel) {
        statusPill.className = `status-indicator-pill ${state}`;
        if (state === 'synced') {
            statusLabel.textContent = "Live — Cloud Synced";
            if (syncStateVal) syncStateVal.textContent = "Active Stream Connected";
            if (statusDesc) statusDesc.textContent = "Successfully receiving live ultrasonic fill packets from field ESP32 nodes via Firebase Realtime Database.";
            if (settingsSyncState) settingsSyncState.textContent = "Connected (Streaming)";
        } else if (state === 'error') {
            statusLabel.textContent = "Connection Error";
            if (syncStateVal) syncStateVal.textContent = "Disconnected / Error";
            if (statusDesc) statusDesc.textContent = "Unable to establish WebSocket stream to Firebase. Verify network access and database rules.";
            if (settingsSyncState) settingsSyncState.textContent = "Error";
        } else {
            statusLabel.textContent = "Awaiting Cloud Sync";
            if (syncStateVal) syncStateVal.textContent = "Awaiting Initial Payload";
            if (statusDesc) statusDesc.textContent = "Firebase configured and listening. Awaiting the first telemetry payload from smart bins.";
            if (settingsSyncState) settingsSyncState.textContent = "Listening (Pending Data)";
        }
    }
}

/**
 * triggerDataPulse — Subtle micro-animation when Firebase data updates.
 */
function triggerDataPulse() {
    const summaryCards = document.querySelectorAll('.summary-card');
    summaryCards.forEach(card => {
        card.classList.remove('live-pulse');
        void card.offsetHeight; // reflow
        card.classList.add('live-pulse');
        setTimeout(() => card.classList.remove('live-pulse'), 1200);
    });
}

// Monitor raw connection state via .info/connected
connectedRef.on("value", (snap) => {
    if (snap.val() === false && firebaseSyncStatus !== 'synced') {
        updateFirebaseSyncUI('awaiting');
    }
});

// Live listener for bin entries
binsRef.on("value", (snapshot) => {
    const data = snapshot.val();
    if (data && Object.keys(data).length > 0) {
        bins = Object.values(data);
        updateFirebaseSyncUI('synced');
    } else {
        bins = [];
        updateFirebaseSyncUI('awaiting');
    }

    renderAll();
    triggerDataPulse();
}, (error) => {
    console.error("Firebase Realtime Database listener error:", error);
    updateFirebaseSyncUI('error');
});


/* ============================================================
   2. COLLECTION AUDIT & STATIC METRICS
   ============================================================ */
const collectionHistory = [
    { date: "Sep 12, 2026 — 08:30 AM", binId: "BIN-06", location: "Hostel B",      fillAtCollection: 97, collectedBy: "Officer Arjun", type: "emergency" },
    { date: "Sep 12, 2026 — 08:15 AM", binId: "BIN-02", location: "Canteen",       fillAtCollection: 90, collectedBy: "Officer Arjun", type: "emergency" },
    { date: "Sep 11, 2026 — 06:00 PM", binId: "BIN-05", location: "Parking Area",  fillAtCollection: 82, collectedBy: "Driver Meera",   type: "completed" },
    { date: "Sep 11, 2026 — 05:30 PM", binId: "BIN-03", location: "Library",       fillAtCollection: 60, collectedBy: "Driver Meera",   type: "completed" },
    { date: "Sep 11, 2026 — 02:00 PM", binId: "BIN-04", location: "Hostel A",      fillAtCollection: 45, collectedBy: "Officer Arjun", type: "completed" },
    { date: "Sep 11, 2026 — 09:00 AM", binId: "BIN-01", location: "Main Block",    fillAtCollection: 50, collectedBy: "Driver Kabir",   type: "completed" },
    { date: "Sep 10, 2026 — 07:00 PM", binId: "BIN-06", location: "Hostel B",      fillAtCollection: 95, collectedBy: "Officer Arjun", type: "emergency" },
    { date: "Sep 10, 2026 — 06:00 PM", binId: "BIN-02", location: "Canteen",       fillAtCollection: 88, collectedBy: "Driver Meera",   type: "completed" }
];

const pageTitles = {
    dashboard: { title: "Operations Command Center",        subtitle: "Real-time ultrasonic telemetry, IoT fleet monitoring, and dynamic collection dispatch" },
    bins:      { title: "Smart Bins & Hardware Nodes",      subtitle: "Live ultrasonic sensor telemetry, fill diagnostics, and hardware health" },
    route:     { title: "Intelligent Route Dispatch",        subtitle: "Autonomous priority sequencing and dynamic logistics optimization" },
    ai:        { title: "AI Predictive & Route Workspace",   subtitle: "Neural fill velocity forecasting, overflow prediction, and dynamic TSP optimization" },
    analytics: { title: "Analytics & Telemetry",            subtitle: "Campus waste velocity metrics, fill distribution, and capacity comparison" },
    history:   { title: "Collection Audit Log",              subtitle: "Historical collection records, response telemetry, and fleet performance" },
    settings:  { title: "Platform Architecture & Config",   subtitle: "Sensor thresholds, notification rules, and Firebase cloud integration" },
};


/* ============================================================
   3. UTILITIES & STATUS DETERMINATION
   ============================================================ */
function getBinStatus(fillLevel) {
    const level = Number(fillLevel) || 0;
    if (level >= 90) {
        return { label: "Critical",    className: "critical",    priority: "HIGH",   risk: "High" };
    } else if (level >= 80) {
        return { label: "Nearly Full", className: "warning",     priority: "MEDIUM", risk: "Elevated" };
    } else if (level >= 50) {
        return { label: "Medium",      className: "medium",      priority: "LOW",    risk: "Moderate" };
    } else {
        return { label: "Normal",      className: "normal",      priority: "NONE",   risk: "Nominal" };
    }
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

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
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
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


/* ============================================================
   4. MASTER RENDER FUNCTIONS
   ============================================================ */

/**
 * updateSummary — Updates header stats & the 4 executive summary cards.
 */
function updateSummary(forceFromZero = false) {
    let normal = 0, medium = 0, warning = 0, critical = 0;

    bins.forEach(bin => {
        const status = getBinStatus(bin.fillLevel);
        switch (status.className) {
            case "normal":   normal++;   break;
            case "medium":   medium++;   break;
            case "warning":  warning++;  break;
            case "critical": critical++; break;
        }
    });

    const totalCount = bins.length;
    const normalCount = normal + medium;

    animateCounter('totalBins', totalCount, 800, forceFromZero);
    animateCounter('normalBins', normalCount, 800, forceFromZero);
    animateCounter('nearlyFullBins', warning, 800, forceFromZero);
    animateCounter('criticalBins', critical, 800, forceFromZero);

    // Header fleet tag & sensors tag
    const headerFleet = document.getElementById('headerFleetVal');
    if (headerFleet) headerFleet.innerHTML = `<i class='bx bx-chip'></i> ${totalCount} Nodes`;

    const sensorsOnline = document.getElementById('sensorsOnline');
    if (sensorsOnline) sensorsOnline.textContent = `${totalCount} / ${totalCount}`;

    // System Health calculation (100% minus penalty for criticals)
    const healthVal = document.getElementById('headerHealthVal');
    if (healthVal) {
        const healthPct = totalCount === 0 ? 100 : Math.max(70, Math.round(100 - (critical * 5) - (warning * 2)));
        healthVal.innerHTML = `<i class='bx bx-pulse'></i> ${healthPct}%`;
        healthVal.className = healthPct >= 90 ? 'h-metric-val health-good' : 'h-metric-val health-warn';
    }

    // Radial ring
    const normalRing = document.getElementById('normalRingProgress');
    if (normalRing && totalCount > 0) {
        const pct = normalCount / totalCount;
        const offset = Math.max(0, Math.round(88 * (1 - pct)));
        normalRing.style.strokeDashoffset = offset;
    }
}

/**
 * buildBinCardsHTML — Generates premium glassmorphic bin hardware cards.
 */
function buildBinCardsHTML(binsToRender) {
    if (binsToRender.length === 0) {
        if (firebaseSyncStatus === 'awaiting') {
            return `
                <div class="empty-state-box awaiting">
                    <div class="empty-state-icon"><i class='bx bx-loader-alt bx-spin'></i></div>
                    <h4>Awaiting Firebase Realtime Telemetry</h4>
                    <p>Connecting to Firebase Realtime Database stream. Once live bin packets arrive, hardware telemetry cards will populate here.</p>
                </div>
            `;
        }
        return `
            <div class="empty-state-box">
                <div class="empty-state-icon"><i class='bx bx-search-alt'></i></div>
                <h4>No Bins Found</h4>
                <p>No smart bins match your current filter criteria or search query.</p>
            </div>
        `;
    }

    return binsToRender.map(bin => {
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id.replace("BIN-", "");

        return `
            <div class="bin-card status-${status.className}" 
                 onclick="showBinDetails('${bin.id}')"
                 title="Inspect hardware node ${bin.id}">
                <div class="bin-card-top">
                    <div class="bin-id-block">
                        <span class="bin-sensor-tag"><i class='bx bx-chip'></i> ${bin.sensorId || 'ESP32'}</span>
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
                        <span class="fill-lbl">Ultrasonic Fill</span>
                        <span class="percent ${status.className}">${bin.fillLevel}%</span>
                    </div>
                </div>
                <div class="bin-card-footer">
                    <span class="bin-ping"><i class='bx bx-time'></i> ${bin.lastUpdated || 'Live'}</span>
                    <button class="bin-action-btn" onclick="event.stopPropagation(); showBinDetails('${bin.id}')">
                        Inspect &rarr;
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderBins(binsToRender) {
    const el = document.getElementById('binsGrid');
    if (el) el.innerHTML = buildBinCardsHTML(binsToRender);
}

function renderBinsPage(binsToRender) {
    const el = document.getElementById('binsGridPage');
    if (el) el.innerHTML = buildBinCardsHTML(binsToRender);
    const countEl = document.getElementById('binsPageCount');
    if (countEl) countEl.textContent = binsToRender.length;
}

/**
 * renderAlerts — Compact, high-priority actionable alerts on the Dashboard.
 */
function renderAlerts() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    const alertBins = bins
        .filter(bin => Number(bin.fillLevel) >= 80)
        .sort((a, b) => Number(b.fillLevel) - Number(a.fillLevel));

    const alertCountBadge = document.getElementById('alertCountBadge');
    if (alertCountBadge) {
        if (alertBins.length > 0) {
            alertCountBadge.textContent = `${alertBins.length} Requires Action`;
            alertCountBadge.className = 'arena-tag critical';
        } else {
            alertCountBadge.textContent = "All Nominal";
            alertCountBadge.className = 'arena-tag normal';
        }
    }

    if (alertBins.length === 0) {
        container.innerHTML = `
            <div class="no-alerts-card">
                <div class="no-alerts-icon"><i class='bx bx-check-shield'></i></div>
                <div class="no-alerts-content">
                    <h4>All Campus Bins Within Safe Limits</h4>
                    <p>No critical fill thresholds exceeded. Realtime ultrasonic monitoring is actively scanning.</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = alertBins.map(bin => {
        const isCritical = Number(bin.fillLevel) >= 90;
        const binNumber = bin.id.replace("BIN-", "");

        return `
            <div class="alert-item ${isCritical ? 'critical' : 'warning'}" onclick="showBinDetails('${bin.id}')">
                <div class="alert-left-meta">
                    <span class="alert-status-pill ${isCritical ? 'critical' : 'warning'}">
                        <span class="alert-pulse-ring"></span>
                        ${isCritical ? 'CRITICAL DISPATCH' : 'CAPACITY WARNING'}
                    </span>
                    <span class="alert-bin-name">Bin ${binNumber} &bull; ${bin.location}</span>
                    <span class="alert-ping-time"><i class='bx bx-time'></i> ${bin.lastUpdated || 'just now'}</span>
                </div>
                <div class="alert-right-action">
                    <div class="alert-capacity-metric">
                        <span class="metric-num ${isCritical ? 'critical' : 'warning'}">${bin.fillLevel}%</span>
                    </div>
                    <button class="alert-dispatch-btn" onclick="event.stopPropagation(); showBinDetails('${bin.id}')">
                        Inspect &rarr;
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * buildRouteHTML — Clean, connected node graph representation:
 * DEPOT ─── BIN ─── BIN ─── COLLECTION POINT
 */
async function buildRouteHTML() {

    // Get the optimized TSP route from the backend
    let routeData;

    try {
        const response = await fetch(
            "https://smart-waste-backend-twjs.onrender.com/plan-route"
        );

        if (!response.ok) {
            throw new Error("Route planning request failed");
        }

        routeData = await response.json();

    } catch (error) {

        console.error("TSP route error:", error);

        const errorHtml = `
            <div class="empty-route-state">
                <i class='bx bx-error-circle'></i>
                <p>Unable to generate the optimized collection route.</p>
            </div>
        `;

        return {
            html: errorHtml,
            stopCount: 0,
            criticalCount: 0
        };
    }


    // No bins require collection
    if (!routeData.route || routeData.route.length <= 2) {

        const emptyHtml = `
            <div class="empty-route-state">
                <i class='bx bx-check-circle'></i>
                <p>No bins currently require collection. Fleet is at Central Depot on standby.</p>
            </div>
        `;

        return {
            html: emptyHtml,
            stopCount: 0,
            criticalCount: 0
        };
    }


    // --------------------------------------------------
    // STARTING DEPOT
    // --------------------------------------------------

    let html = `
        <div class="route-node depot origin">
            <div class="route-node-spine">
                <span class="spine-icon">
                    <i class='bx bxs-institution'></i>
                </span>
                <span class="spine-connector"></span>
            </div>

            <div class="route-node-content">
                <span class="route-badge depot">START POINT</span>

                <div class="route-node-name">
                    Central Fleet Depot
                </div>

                <span class="route-node-sub">
                    Collection vehicle departure &amp; logistics check
                </span>
            </div>
        </div>
    `;


    // --------------------------------------------------
    // TSP BIN ROUTE
    // --------------------------------------------------

    const routeBins = routeData.route.filter(
        point => point.type === "bin"
    );


    routeBins.forEach((bin, index) => {

        const status = getBinStatus(bin.fillLevel);

        const binNumber = bin.id.replace("BIN-", "");

        html += `
            <div class="route-node ${status.className}"
                 onclick="showBinDetails('${bin.id}')">

                <div class="route-node-spine">

                    <span class="spine-icon ${status.className}">
                        ${index + 1}
                    </span>

                    <span class="spine-connector"></span>

                </div>

                <div class="route-node-content">

                    <div class="route-node-header">

                        <span class="route-badge ${status.className}">
                            Priority ${status.priority}
                        </span>

                        <span class="route-node-fill ${status.className}">
                            ${bin.fillLevel}%
                        </span>

                    </div>

                    <div class="route-node-name">
                        Bin ${binNumber} &bull; ${bin.location}
                    </div>

                    <div class="route-node-footer">

                        <span>
                            <i class='bx bx-chip'></i>
                            ${bin.sensorId || 'ESP32'}
                        </span>

                        <span class="action-link">
                            View Details &rarr;
                        </span>

                    </div>

                </div>

            </div>
        `;
    });


    // --------------------------------------------------
    // FINAL COLLECTION FACILITY
    // --------------------------------------------------

    html += `
        <div class="route-node depot destination">

            <div class="route-node-spine">

                <span class="spine-icon">
                    <i class='bx bxs-flag-checkered'></i>
                </span>

            </div>

            <div class="route-node-content">

                <span class="route-badge depot">
                    COLLECTION POINT
                </span>

                <div class="route-node-name">
                    Central Waste Facility
                </div>

                <span class="route-node-sub">
                    Waste unloading, compaction &amp; depot return
                </span>

            </div>

        </div>
    `;


    // --------------------------------------------------
    // COUNTS
    // --------------------------------------------------

    const criticalCount = routeBins.filter(
        bin => Number(bin.fillLevel) >= 90
    ).length;


    return {
        html: html,
        stopCount: routeBins.length,
        criticalCount: criticalCount
    };
}

async function generateRoute() {
    const el = document.getElementById('routeContainer');
    if (!el) return;

    const { html } = await buildRouteHTML();

    el.innerHTML = html;
}

async function renderRoutePage() {
    const el = document.getElementById('routeContainerPage');
    if (!el) return;

    const { html, stopCount, criticalCount } = await buildRouteHTML();

    el.innerHTML = html;

    const stopsEl = document.getElementById('routeStops');
    if (stopsEl) {
        stopsEl.textContent = stopCount;
    }

    const critEl = document.getElementById('routeCritical');
    if (critEl) {
        critEl.textContent = criticalCount;
    }

    const etaEl = document.getElementById('routeETA');

    if (etaEl) {
        etaEl.textContent =
            stopCount === 0
                ? '~0 min'
                : `~${stopCount * 6 + 12} min`;
    }

    const distEl = document.getElementById('routeDistance');

    if (distEl) {
        distEl.textContent =
            stopCount === 0
                ? '~0.0 km'
                : `~${(stopCount * 0.75 + 1.2).toFixed(1)} km`;
    }
}
/**
 * renderMapMarkersIn — Places interactive color-coded beacons onto the live GIS campus map.
 */
function renderMapMarkersIn(mapBgSelector) {
    const mapBg = document.querySelector(mapBgSelector);
    if (!mapBg) return;

    mapBg.querySelectorAll('.map-marker').forEach(m => m.remove());

    const mapNodeCountBadge = document.getElementById('mapNodeCountBadge');
    if (mapNodeCountBadge) {
        mapNodeCountBadge.innerHTML = `<span class="node-ping-dot"></span> ${bins.length} Active Node${bins.length !== 1 ? 's' : ''}`;
    }

    if (bins.length === 0) {
        return;
    }

    bins.forEach(bin => {
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id.replace("BIN-", "");

        const marker = document.createElement('div');
        marker.className = `map-marker status-${status.className}`;
        marker.style.top = `${bin.lat || 50}%`;
        marker.style.left = `${bin.lng || 50}%`;
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

function renderMapMarkers() {
    renderMapMarkersIn('#mapPlaceholder .map-bg');
}

/**
 * renderChartIn — Horizontal telemetry fill bars.
 */
function renderChartIn(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (bins.length === 0) {
        container.innerHTML = `
            <div class="chart-empty">
                <i class='bx bx-bar-chart-alt-2'></i>
                <p>Awaiting live fill measurements from Firebase Realtime Database.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = bins.map(bin => {
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id.replace("BIN-", "");

        return `
            <div class="chart-bar-row">
                <div class="chart-label-group">
                    <span class="chart-label">Bin ${binNumber}</span>
                    <span class="chart-loc">${bin.location}</span>
                </div>
                <div class="chart-bar">
                    <div class="chart-fill ${status.className}" style="width: ${bin.fillLevel}%"></div>
                </div>
                <span class="chart-val ${status.className}">${bin.fillLevel}%</span>
            </div>
        `;
    }).join('');
}

function renderChart() {
    renderChartIn('chartContainer');
}

/**
 * renderAIPage — Renders the dedicated AI Workspace with Overflow Forecasting and Route Optimization.
 */
function renderAIPage() {
    // 1. AI Overflow Prediction Engine table
    const tbody = document.getElementById('aiPredictionBody');
    if (tbody) {
        if (bins.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">Awaiting live telemetry packets from Firebase to train fill velocity weights.</td>
                </tr>
            `;
        } else {
            tbody.innerHTML = bins.map(bin => {
                const status = getBinStatus(bin.fillLevel);
                const binNum = bin.id.replace("BIN-", "");
                const fill = Number(bin.fillLevel) || 0;

                // Neural model heuristic projection
                let overflowEstimate = "—";
                let estTime = "—";
                if (fill >= 90) {
                    overflowEstimate = "Immediate (At Limit)";
                    estTime = "< 1 hour";
                } else if (fill >= 80) {
                    overflowEstimate = "Today (Evening)";
                    estTime = "~3 - 4 hours";
                } else if (fill >= 50) {
                    overflowEstimate = "Tomorrow (Morning)";
                    estTime = "~14 - 18 hours";
                } else {
                    overflowEstimate = "Nominal (> 36h)";
                    estTime = "> 36 hours";
                }

                return `
                    <tr>
                        <td><strong>Bin ${binNum}</strong> <span class="dim">(${bin.id})</span></td>
                        <td>${bin.location}</td>
                        <td><span class="table-pct ${status.className}">${fill}%</span></td>
                        <td><span class="ai-forecast-badge ${status.className}">${overflowEstimate}</span></td>
                        <td>${estTime}</td>
                        <td><span class="risk-badge ${status.className}">${status.risk}</span></td>
                    </tr>
                `;
            }).join('');
        }
    }

    // 2. AI Route Pipeline Stops
    const pipelineStops = document.getElementById('aiPipelineStops');
    if (pipelineStops) {
        const priorityBins = bins.filter(b => Number(b.fillLevel) >= 50).sort((a, b) => Number(b.fillLevel) - Number(a.fillLevel));
        if (priorityBins.length === 0) {
            pipelineStops.innerHTML = `
                <div class="pipe-node-meta empty">
                    <strong>NO CRITICAL STOPS SCHEDULED</strong>
                    <span>All smart bins currently operating under collection dispatch threshold</span>
                </div>
            `;
        } else {
            pipelineStops.innerHTML = priorityBins.map((bin, idx) => {
                const status = getBinStatus(bin.fillLevel);
                const binNum = bin.id.replace("BIN-", "");
                return `
                    <div class="ai-stop-chip ${status.className}">
                        <span class="chip-step">#${idx + 1}</span>
                        <span class="chip-id">Bin ${binNum} (${bin.location})</span>
                        <span class="chip-fill ${status.className}">${bin.fillLevel}%</span>
                    </div>
                `;
            }).join('');
        }
    }
}

/**
 * renderAnalyticsPage — Analytics workspace with distribution breakdown.
 */
function renderAnalyticsPage() {
    renderChartIn('chartContainerAnalytics');

    let normal = 0, medium = 0, warning = 0, critical = 0;
    bins.forEach(bin => {
        const status = getBinStatus(bin.fillLevel);
        switch (status.className) {
            case "normal":   normal++;   break;
            case "medium":   medium++;   break;
            case "warning":  warning++;  break;
            case "critical": critical++; break;
        }
    });

    const total = bins.length || 1;

    const dNormal = document.getElementById('distNormal');
    const dMedium = document.getElementById('distMedium');
    const dWarning = document.getElementById('distWarning');
    const dCritical = document.getElementById('distCritical');

    if (dNormal) dNormal.style.height = `${(normal / total) * 100}%`;
    if (dMedium) dMedium.style.height = `${(medium / total) * 100}%`;
    if (dWarning) dWarning.style.height = `${(warning / total) * 100}%`;
    if (dCritical) dCritical.style.height = `${(critical / total) * 100}%`;

    const dNormalVal = document.getElementById('distNormalVal');
    const dMediumVal = document.getElementById('distMediumVal');
    const dWarningVal = document.getElementById('distWarningVal');
    const dCriticalVal = document.getElementById('distCriticalVal');

    if (dNormalVal) dNormalVal.textContent = normal;
    if (dMediumVal) dMediumVal.textContent = medium;
    if (dWarningVal) dWarningVal.textContent = warning;
    if (dCriticalVal) dCriticalVal.textContent = critical;
}

/**
 * renderHistoryPage — Collection audit log.
 */
function renderHistoryPage() {
    const tbody = document.getElementById('historyBody');
    if (!tbody) return;

    tbody.innerHTML = collectionHistory.map(rec => {
        const isEmergency = rec.type === 'emergency';
        return `
            <tr>
                <td>${rec.date}</td>
                <td><strong>${rec.binId}</strong></td>
                <td>${rec.location}</td>
                <td><strong>${rec.fillAtCollection}%</strong></td>
                <td>${rec.collectedBy}</td>
                <td><span class="table-status ${isEmergency ? 'emergency' : 'completed'}">${isEmergency ? 'Emergency Dispatch' : 'Routine Completed'}</span></td>
            </tr>
        `;
    }).join('');
}

/**
 * renderSettingsPage — Hardware & configuration state.
 */
function renderSettingsPage() {
    const isDark = document.body.classList.contains('dark-theme');
    const toggle = document.getElementById('settingsDarkModeToggle');
    if (toggle) toggle.checked = isDark;

    const label = document.getElementById('currentThemeLabel');
    if (label) label.textContent = isDark ? 'Dark' : 'Light';
}

function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('lastUpdate');
    if (dateEl) dateEl.textContent = formatDate(now);
    if (timeEl) timeEl.textContent = formatTime(now);
}

function renderAll(forceCountAnimation = false) {
    updateDateTime();
    updateSummary(forceCountAnimation);
    renderBins(bins);
    renderAlerts();
    generateRoute();
    renderMapMarkers();
    renderChart();

    // Re-render active page if non-dashboard
    if (currentPage !== 'dashboard') {
        navigateToPage(currentPage);
    }
}


/* ============================================================
   5. PAGE NAVIGATION & SWITCHING
   ============================================================ */
let currentPage = 'dashboard';

function navigateToPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const target = document.getElementById(`page-${pageName}`);
    if (target) {
        target.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });

    const pageInfo = pageTitles[pageName] || pageTitles.dashboard;
    const titleEl = document.getElementById('pageTitle');
    const subEl = document.getElementById('pageSubtitle');
    if (titleEl) titleEl.textContent = pageInfo.title;
    if (subEl) subEl.textContent = pageInfo.subtitle;

    switch (pageName) {
        case 'bins':
            renderBinsPage(bins);
            break;
        case 'route':
            renderRoutePage();
            break;
        case 'ai':
            renderAIPage();
            break;
        case 'analytics':
            renderAnalyticsPage();
            break;
        case 'history':
            renderHistoryPage();
            break;
        case 'settings':
            renderSettingsPage();
            break;
    }

    currentPage = pageName;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ============================================================
   6. FILTERING, SEARCH, MODAL INSPECTION & THEME
   ============================================================ */
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
            bin.location.toLowerCase().includes(searchText) ||
            (bin.sensorId && bin.sensorId.toLowerCase().includes(searchText))
        );
    }

    return filtered;
}

function filterBinsPage(filterType) {
    const searchEl = document.getElementById('searchInputBins');
    const searchText = searchEl ? searchEl.value.toLowerCase().trim() : '';
    renderBinsPage(getFilteredBins(filterType, searchText));
}

function searchBinsPage() {
    const searchEl = document.getElementById('searchInputBins');
    const searchText = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const activeFilter = document.querySelector('#filterButtonsBins .filter-btn.active');
    const filterType = activeFilter ? activeFilter.dataset.filter : 'all';
    renderBinsPage(getFilteredBins(filterType, searchText));
}

function showBinDetails(binId) {
    const bin = bins.find(b => b.id === binId);
    if (!bin) return;

    const status = getBinStatus(bin.fillLevel);
    const binNumber = bin.id.replace("BIN-", "");

    const modalId = document.getElementById('modalBinId');
    const modalLoc = document.getElementById('modalLocation');
    const modalPct = document.getElementById('modalFillPercent');
    const modalUpdated = document.getElementById('modalLastUpdated');
    const modalSens = document.getElementById('modalSensor');
    const modalStat = document.getElementById('modalStatus');
    const modalPrio = document.getElementById('modalPriority');
    const fillBar = document.getElementById('modalFillBar');
    const header = document.getElementById('modalHeader');

    if (modalId) modalId.textContent = `Bin ${binNumber} (${bin.id})`;
    if (modalLoc) modalLoc.textContent = bin.location;
    if (modalPct) modalPct.textContent = `${bin.fillLevel}%`;
    if (modalUpdated) modalUpdated.textContent = bin.lastUpdated || 'Live Telemetry';
    if (modalSens) modalSens.textContent = bin.sensorId || 'ESP32-CORE';

    if (modalStat) {
        modalStat.textContent = status.label;
        modalStat.style.color = `var(--status-${status.className === 'warning' ? 'warning' : (status.className === 'normal' ? 'normal' : status.className)})`;
    }

    if (modalPrio) {
        modalPrio.textContent = status.priority;
        modalPrio.style.fontWeight = '700';
    }

    if (fillBar) {
        fillBar.style.width = `${bin.fillLevel}%`;
        fillBar.className = `modal-fill-progress ${status.className}`;
    }

    if (header) {
        header.className = `modal-header ${status.className}`;
    }

    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
}

function saveThresholds() {
    alert('Threshold preferences updated! (In production, thresholds sync directly with ESP32 threshold triggers in Firebase.)');
}

function updateThemeUI(isDark) {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.innerHTML = isDark ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
        themeBtn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    }

    const mobileThemeBtn = document.getElementById('mobileThemeToggle');
    if (mobileThemeBtn) {
        mobileThemeBtn.innerHTML = isDark ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
    }

    const settingsToggle = document.getElementById('settingsDarkModeToggle');
    if (settingsToggle) settingsToggle.checked = isDark;

    const currentThemeLabel = document.getElementById('currentThemeLabel');
    if (currentThemeLabel) currentThemeLabel.textContent = isDark ? 'Dark' : 'Light';
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    try {
        localStorage.setItem('swm-theme', isDark ? 'dark' : 'light');
    } catch (e) {}
    updateThemeUI(isDark);
}

function initTheme() {
    let savedTheme = null;
    try {
        savedTheme = localStorage.getItem('swm-theme');
    } catch (e) {}

    // Default to dark theme for modern IoT command center
    let isDark = true;
    if (savedTheme === 'light') isDark = false;

    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    updateThemeUI(isDark);
}


/* ============================================================
   7. INITIALIZATION & EVENT HANDLERS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateFirebaseSyncUI('awaiting');
    renderAll(true);

    // Search: Bins page
    const searchBinsInput = document.getElementById('searchInputBins');
    if (searchBinsInput) {
        searchBinsInput.addEventListener('input', searchBinsPage);
    }

    // Filter buttons: Bins page
    document.querySelectorAll('#filterButtonsBins .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filterButtonsBins .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterBinsPage(btn.dataset.filter);
        });
    });

    // Refresh sync button
    const refreshBtn = document.getElementById('btnRefresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const icon = refreshBtn.querySelector('i');
            if (icon) {
                icon.classList.add('bx-spin');
                setTimeout(() => icon.classList.remove('bx-spin'), 700);
            }
            renderAll(true);
        });
    }

    // Modal
    const modalClose = document.getElementById('modalClose');
    if (modalClose) modalClose.addEventListener('click', closeModal);

    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.dataset.page;
            navigateToPage(pageName);
            closeSidebar();
        });
    });

    // Mobile sidebar
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburger');

    if (hamburger && sidebar && overlay) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });

        overlay.addEventListener('click', closeSidebar);
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    }

    // Theme toggles
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    if (mobileThemeToggle) mobileThemeToggle.addEventListener('click', toggleTheme);

    const settingsDarkModeToggle = document.getElementById('settingsDarkModeToggle');
    if (settingsDarkModeToggle) settingsDarkModeToggle.addEventListener('change', toggleTheme);
});
