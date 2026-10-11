/* ============================================================
   SMART WASTE MANAGEMENT PLATFORM — JAVASCRIPT LOGIC
   
   Architecture:
   1. FIREBASE REALTIME DATABASE — Live WebSocket connection & status
   2. DATA & UTILITIES           — Status helpers, formatting, counters
   3. RENDER WORKSPACES          — Overview, Bins, Route, Analytics, Settings
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
let lastSyncTime = null;

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

    // Settings Page Hardware / Sync state
    const settingsSyncState = document.getElementById('settingsSyncState');
    if (settingsSyncState) {
        if (state === 'synced') {
            settingsSyncState.textContent = "Connected (Streaming)";
        } else if (state === 'error') {
            settingsSyncState.textContent = "Error / Disconnected";
        } else {
            settingsSyncState.textContent = "Listening (Pending Data)";
        }
    }
}

/**
 * triggerDataPulse — Subtle UI indication when Firebase data updates.
 */
function triggerDataPulse() {
    const headerPill = document.querySelector('.header-sync-pill');
    if (headerPill) {
        headerPill.classList.remove('live-pulse');
        void headerPill.offsetHeight;
        headerPill.classList.add('live-pulse');
        setTimeout(() => headerPill.classList.remove('live-pulse'), 800);
    }
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
    lastSyncTime = new Date();
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

// ============================================================
// ESP32 CONNECTION STATUS
// ============================================================

function updateESP32Status() {
    const statusText = document.getElementById("esp32StatusText");
    if (!statusText) return;

    // BIN-01 is the ESP32 hardware prototype
    const bin = bins.find(b => b.id === "BIN-01");

    if (!bin || !bin.lastUpdated) {
        statusText.textContent = "OFFLINE";
        statusText.className = "info-val disconnected";
        return;
    }

    const lastUpdate = new Date(bin.lastUpdated).getTime();
    const now = Date.now();
    const age = now - lastUpdate;

    // Connected if telemetry received within last 15 seconds
    if (age <= 15000) {
        statusText.textContent = "ONLINE (STREAMING)";
        statusText.className = "info-val connected";
    } else {
        statusText.textContent = "STANDBY (STALE)";
        statusText.className = "info-val disconnected";
    }
}

// Check ESP32 status every 2 seconds
setInterval(updateESP32Status, 2000);

const pageTitles = {
    dashboard: { title: "Operations Overview", subtitle: "Live campus fill telemetry, priority alerts, and collection scheduling" },
    bins:      { title: "Bin Monitoring", subtitle: "Individual node telemetry, fill levels, and sensor health" },
    estimates: { title: "Operations Analytics", subtitle: "Rule-based predictive depletion horizons, overflow forecasts, and capacity telemetry" },
    analytics: { title: "Operations Analytics", subtitle: "Rule-based predictive depletion horizons, overflow forecasts, and capacity telemetry" },
    ai:        { title: "Collection Routes", subtitle: "Priority-sequenced collection route departing from Central Fleet Depot" },
    route:     { title: "Collection Routes", subtitle: "Priority-sequenced collection route departing from Central Fleet Depot" },
    settings:  { title: "Settings", subtitle: "System thresholds, theme preferences, and telemetry diagnostics" },
};


/* ============================================================
   2. OPERATIONAL THRESHOLDS STATE & CLASSIFICATION
   ============================================================ */
const DEFAULT_THRESHOLDS = {
    normal: 40,      // Safe tier: 0% to normal% (<= normal)
    medium: 60,      // Moderate tier: > normal% and < warning%
    warning: 80,     // Nearly Full tier: >= warning% and < critical%
    critical: 90     // Critical tier: >= critical%
};

let thresholds = { ...DEFAULT_THRESHOLDS };

function loadThresholds() {
    try {
        const saved = localStorage.getItem('swm-thresholds');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.critical === 'number') {
                thresholds = {
                    normal: Number(parsed.normal) || DEFAULT_THRESHOLDS.normal,
                    medium: Number(parsed.medium) || DEFAULT_THRESHOLDS.medium,
                    warning: Number(parsed.warning) || DEFAULT_THRESHOLDS.warning,
                    critical: Number(parsed.critical) || DEFAULT_THRESHOLDS.critical
                };
            }
        }
    } catch (e) {
        console.warn("Could not load saved thresholds:", e);
    }
}

// Load persisted thresholds
loadThresholds();

function updateThresholdLabels() {
    const n = thresholds.normal;
    const m = thresholds.medium;
    const w = thresholds.warning;
    const c = thresholds.critical;

    const medStart = n + 1;
    const medEnd = w - 1;

    // 1. Dashboard summary card KPI pills
    const pillNormal = document.getElementById('kpiPillNormal');
    const pillMedium = document.getElementById('kpiPillMedium');
    const pillWarning = document.getElementById('kpiPillWarning');
    const pillCritical = document.getElementById('kpiPillCritical');

    if (pillNormal) pillNormal.innerHTML = `Safe &le; ${n}%`;
    if (pillMedium) pillMedium.innerHTML = `Medium ${medStart}–${medEnd}%`;
    if (pillWarning) pillWarning.innerHTML = `Warning ${w}–${c - 1}%`;
    if (pillCritical) pillCritical.innerHTML = `Critical &ge; ${c}%`;

    // 2. Directory Legend
    const legNorm = document.getElementById('legendTextNormal');
    const legMed = document.getElementById('legendTextMedium');
    const legWarn = document.getElementById('legendTextWarning');
    const legCrit = document.getElementById('legendTextCritical');

    if (legNorm) legNorm.innerHTML = `Normal (&le;${n}%)`;
    if (legMed) legMed.innerHTML = `Medium (${medStart}–${medEnd}%)`;
    if (legWarn) legWarn.innerHTML = `Warning (${w}–${c - 1}%)`;
    if (legCrit) legCrit.innerHTML = `Critical (&ge;${c}%)`;

    // 3. Smart Bins Filter Buttons
    const btnNorm = document.getElementById('filterBtnNormal');
    const btnMed = document.getElementById('filterBtnMedium');
    const btnWarn = document.getElementById('filterBtnWarning');
    const btnCrit = document.getElementById('filterBtnCritical');

    if (btnNorm) btnNorm.innerHTML = `Normal (&le;${n}%)`;
    if (btnMed) btnMed.innerHTML = `Medium (${medStart}–${medEnd}%)`;
    if (btnWarn) btnWarn.innerHTML = `Nearly Full (${w}–${c - 1}%)`;
    if (btnCrit) btnCrit.innerHTML = `Critical (&ge;${c}%)`;

    // 4. Analytics Distribution Cards
    const distNorm = document.getElementById('distLabelNormal');
    const distMed = document.getElementById('distLabelMedium');
    const distWarn = document.getElementById('distLabelWarning');
    const distCrit = document.getElementById('distLabelCritical');

    if (distNorm) distNorm.textContent = `Normal (0–${n}%)`;
    if (distMed) distMed.textContent = `Medium (${medStart}–${medEnd}%)`;
    if (distWarn) distWarn.textContent = `Nearly Full (${w}–${c - 1}%)`;
    if (distCrit) distCrit.textContent = `Critical (≥${c}%)`;

    // 5. Settings Inputs & Live Preview
    const inpNorm = document.getElementById('thresholdNormal');
    const inpMed = document.getElementById('thresholdMedium');
    const inpWarn = document.getElementById('thresholdWarning');
    const inpCrit = document.getElementById('thresholdCritical');

    if (inpNorm && document.activeElement !== inpNorm) inpNorm.value = n;
    if (inpMed && document.activeElement !== inpMed) inpMed.value = m;
    if (inpWarn && document.activeElement !== inpWarn) inpWarn.value = w;
    if (inpCrit && document.activeElement !== inpCrit) inpCrit.value = c;

    const pNorm = document.getElementById('previewRangeNormal');
    const pMed = document.getElementById('previewRangeMedium');
    const pWarn = document.getElementById('previewRangeWarning');
    const pCrit = document.getElementById('previewRangeCritical');

    if (pNorm) pNorm.textContent = `0% – ${n}%`;
    if (pMed) pMed.textContent = `${medStart}% – ${medEnd}%`;
    if (pWarn) pWarn.textContent = `${w}% – ${c - 1}%`;
    if (pCrit) pCrit.textContent = `≥ ${c}%`;
}

function getBinStatus(fillLevel) {
    const level = Number(fillLevel) || 0;
    if (level >= thresholds.critical) {
        return { label: "Critical",    className: "critical",    priority: "HIGH",   risk: "High" };
    } else if (level >= thresholds.warning) {
        return { label: "Nearly Full", className: "warning",     priority: "MEDIUM", risk: "Elevated" };
    } else if (level >= thresholds.medium || level > thresholds.normal) {
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

function formatSensorTimestamp(raw) {
    if (!raw) return 'Live';
    const s = String(raw).trim();
    if (s.includes('ago') || s.toLowerCase() === 'live' || s.toLowerCase() === 'just now') {
        return s;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return s;
}

function animateCounter(elemId, targetValue, duration = 250, forceFromZero = false) {
    const el = document.getElementById(elemId);
    if (!el) return;

    if (typeof targetValue !== 'number' || isNaN(targetValue)) {
        el.textContent = targetValue;
        return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = targetValue;
        return;
    }

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
   3. MASTER RENDER FUNCTIONS
   ============================================================ */

/**
 * updateSummary — Updates the 3 hero summary metrics, status tier breakdown, and supporting telemetry.
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

    if (totalCount === 0) {
        // Honest awaiting state: display em-dashes instead of fabricated zeros
        const nullIds = ['totalBins', 'normalBins', 'mediumBins', 'nearlyFullBins', 'criticalBins', 'tierWarningVal', 'tierCriticalVal'];
        nullIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
        });
    } else {
        animateCounter('totalBins', totalCount, 250, forceFromZero);
        animateCounter('normalBins', normal, 250, forceFromZero);
        animateCounter('mediumBins', medium, 250, forceFromZero);
        animateCounter('nearlyFullBins', warning, 250, forceFromZero);
        animateCounter('criticalBins', critical, 250, forceFromZero);

        const tierWarnEl = document.getElementById('tierWarningVal');
        if (tierWarnEl) tierWarnEl.textContent = warning;
        const tierCritEl = document.getElementById('tierCriticalVal');
        if (tierCritEl) tierCritEl.textContent = critical;
    }

    // Sync Action Required badge on Hero Card 2
    const actionBadge = document.getElementById('actionNeededBadge');
    if (actionBadge) {
        if (totalCount === 0) {
            actionBadge.textContent = "Awaiting Data";
            actionBadge.className = "hmc-pill awaiting";
        } else if (critical > 0) {
            actionBadge.textContent = `${critical} Critical`;
            actionBadge.className = "hmc-pill critical";
        } else if (warning > 0) {
            actionBadge.textContent = `${warning} Scheduled`;
            actionBadge.className = "hmc-pill warning";
        } else {
            actionBadge.textContent = "All Nominal";
            actionBadge.className = "hmc-pill normal";
        }
    }

    // Sync metric pill threshold texts with current active thresholds
    updateThresholdLabels();

    // Header fleet tag & sensors tag
    const headerFleet = document.getElementById('headerFleetVal');
    if (headerFleet) {
        headerFleet.textContent = totalCount > 0 ? `${totalCount} Nodes` : `—`;
    }

    const sensorsOnline = document.getElementById('sensorsOnline');
    if (sensorsOnline) {
        sensorsOnline.textContent = totalCount > 0 ? `${totalCount} / ${totalCount}` : `— / —`;
    }

    // System Health calculation (do not report 100% when no data has arrived)
    const healthVal = document.getElementById('headerHealthVal');
    if (healthVal) {
        if (totalCount === 0) {
            healthVal.textContent = "Awaiting Data";
            healthVal.className = "health-warn";
        } else {
            const healthPct = Math.max(70, Math.round(100 - (critical * 5) - (warning * 2) - (medium * 0.5)));
            healthVal.textContent = `${healthPct}% Nominal`;
            healthVal.className = healthPct >= 90 ? "health-good" : "health-warn";
        }
    }

    // Dashboard supporting info: system fleet state text
    const dashFleetState = document.getElementById('dashFleetStateText');
    if (dashFleetState) {
        if (totalCount === 0) {
            dashFleetState.textContent = "Awaiting Telemetry";
            dashFleetState.className = "info-val";
        } else if (critical > 0) {
            dashFleetState.textContent = "Critical Overflows Reported";
            dashFleetState.className = "info-val critical";
        } else if (warning > 0) {
            dashFleetState.textContent = "Collection Pickups Scheduled";
            dashFleetState.className = "info-val warning";
        } else {
            dashFleetState.textContent = "Nominal Operation (Safe)";
            dashFleetState.className = "info-val connected";
        }
    }

    // Mini distribution bars on overview
    const totalDist = totalCount || 1;
    const mdNorm = document.getElementById('miniDistNormal');
    const mdMed = document.getElementById('miniDistMedium');
    const mdWarn = document.getElementById('miniDistWarning');
    const mdCrit = document.getElementById('miniDistCritical');

    if (mdNorm) mdNorm.style.width = totalCount > 0 ? `${(normal / totalDist) * 100}%` : `0%`;
    if (mdMed) mdMed.style.width = totalCount > 0 ? `${(medium / totalDist) * 100}%` : `0%`;
    if (mdWarn) mdWarn.style.width = totalCount > 0 ? `${(warning / totalDist) * 100}%` : `0%`;
    if (mdCrit) mdCrit.style.width = totalCount > 0 ? `${(critical / totalDist) * 100}%` : `0%`;

    const mdNormVal = document.getElementById('miniDistNormalVal');
    const mdMedVal = document.getElementById('miniDistMediumVal');
    const mdWarnVal = document.getElementById('miniDistWarningVal');
    const mdCritVal = document.getElementById('miniDistCriticalVal');

    if (mdNormVal) mdNormVal.textContent = totalCount > 0 ? normal : '0';
    if (mdMedVal) mdMedVal.textContent = totalCount > 0 ? medium : '0';
    if (mdWarnVal) mdWarnVal.textContent = totalCount > 0 ? warning : '0';
    if (mdCritVal) mdCritVal.textContent = totalCount > 0 ? critical : '0';
}

/**
 * buildBinCardsHTML — Generates clean, professional structured table rows for the Bin Monitoring page.
 */
function buildBinCardsHTML(binsToRender) {
    if (binsToRender.length === 0) {
        if (firebaseSyncStatus === 'awaiting') {
            return `
                <div class="empty-state-box awaiting">
                    <div class="empty-state-icon"><i class='bx bx-sync bx-spin'></i></div>
                    <h4>Awaiting Firebase Realtime Telemetry</h4>
                    <p>Connecting to Firebase Realtime Database stream. Once live bin packets arrive, hardware telemetry nodes will populate here.</p>
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

    return `
        <div class="bins-table-card">
            <table class="bins-data-table">
                <thead>
                    <tr>
                        <th>Bin ID</th>
                        <th>Location</th>
                        <th>Fill Level</th>
                        <th>Status</th>
                        <th>Microcontroller</th>
                        <th>Last Reading</th>
                        <th style="text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${binsToRender.map(bin => {
                        const status = getBinStatus(bin.fillLevel);
                        const binNumber = bin.id.replace("BIN-", "");
                        return `
                            <tr onclick="showBinDetails('${bin.id}')" title="Inspect node ${bin.id}">
                                <td>
                                    <div class="table-bin-id">
                                        <strong>Bin ${binNumber}</strong>
                                        <span class="dim">${bin.id}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="table-loc"><i class='bx bx-map-pin'></i> ${bin.location}</span>
                                </td>
                                <td>
                                    <div class="table-fill-cell">
                                        <div class="table-fill-track">
                                            <div class="table-fill-bar ${status.className}" style="width: ${bin.fillLevel}%"></div>
                                        </div>
                                        <span class="table-fill-val ${status.className}">${bin.fillLevel}%</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="status-badge ${status.className}">
                                        <span class="badge-dot"></span>
                                        ${status.label}
                                    </span>
                                </td>
                                <td>
                                    <span class="table-sensor-id">${bin.sensorId || 'ESP32'}</span>
                                </td>
                                <td>
                                    <span class="table-timestamp"><i class='bx bx-time'></i> ${formatSensorTimestamp(bin.lastUpdated)}</span>
                                </td>
                                <td style="text-align: right;">
                                    <button class="table-inspect-btn" onclick="event.stopPropagation(); showBinDetails('${bin.id}')">
                                        Inspect &rarr;
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
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

    const alertCountBadge = document.getElementById('alertCountBadge');

    // 1. Awaiting data state (No sensor telemetry received yet)
    if (bins.length === 0) {
        if (alertCountBadge) {
            alertCountBadge.textContent = "Awaiting Telemetry";
            alertCountBadge.className = 'arena-tag awaiting';
        }
        container.innerHTML = `
            <div class="priority-empty-state awaiting">
                <div class="priority-empty-icon"><i class='bx bx-sync bx-spin'></i></div>
                <div class="priority-empty-text">
                    <h4>Waiting for Sensor Telemetry</h4>
                    <p>No sensor nodes are currently reporting. Live collection priorities will populate once telemetry arrives from Firebase.</p>
                </div>
            </div>
        `;
        return;
    }

    const urgentBins = bins.filter(bin => Number(bin.fillLevel) >= thresholds.warning);

    // Update badge in section header
    if (alertCountBadge) {
        if (urgentBins.length === 0) {
            alertCountBadge.textContent = "All Nominal";
            alertCountBadge.className = 'arena-tag normal';
        } else {
            alertCountBadge.textContent = `${urgentBins.length} Action Needed`;
            alertCountBadge.className = 'arena-tag critical';
        }
    }

    // Sort bins: bins needing collection above normal bins, sorted by fill descending
    const sortedBins = [...bins].sort((a, b) => {
        const aFill = Number(a.fillLevel) || 0;
        const bFill = Number(b.fillLevel) || 0;
        const aUrgent = aFill >= thresholds.warning;
        const bUrgent = bFill >= thresholds.warning;
        if (aUrgent && !bUrgent) return -1;
        if (!aUrgent && bUrgent) return 1;
        return bFill - aFill;
    });

    container.innerHTML = `
        <div class="priority-table-wrapper">
            <table class="priority-data-table">
                <thead>
                    <tr>
                        <th>Bin ID</th>
                        <th>Campus Location</th>
                        <th>Fill Level</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th style="text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedBins.map(bin => {
                        const status = getBinStatus(bin.fillLevel);
                        const binNum = bin.id ? bin.id.replace("BIN-", "") : bin.id;
                        const fill = Number(bin.fillLevel) || 0;
                        const isUrgent = fill >= thresholds.warning;

                        return `
                            <tr class="${isUrgent ? 'row-urgent' : ''}" onclick="showBinDetails('${bin.id}')" title="Inspect node ${bin.id}">
                                <td>
                                    <div class="priority-bin-id">
                                        <strong>Bin ${binNum}</strong>
                                        <span class="dim">${bin.id}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="priority-loc"><i class='bx bx-map-pin'></i> ${bin.location || 'Campus Facility'}</span>
                                </td>
                                <td>
                                    <div class="priority-fill-cell">
                                        <div class="priority-fill-track">
                                            <div class="priority-fill-bar ${status.className}" style="width: ${fill}%"></div>
                                        </div>
                                        <span class="priority-fill-num ${status.className}">${fill}%</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="status-indicator-badge ${status.className}">
                                        <span class="status-indicator-dot ${status.className}"></span>
                                        ${status.label}
                                    </span>
                                </td>
                                <td>
                                    <span class="priority-timestamp"><i class='bx bx-time'></i> ${formatSensorTimestamp(bin.lastUpdated)}</span>
                                </td>
                                <td style="text-align: right;">
                                    <button class="priority-inspect-btn" onclick="event.stopPropagation(); showBinDetails('${bin.id}')">
                                        Inspect &rarr;
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/* ============================================================
   CAMPUS DISTANCE SYSTEM & MULTI-OBJECTIVE ROUTE PLANNER
   ============================================================ */

/**
 * Returns fixed campus grid coordinates for any node (0–100 scale).
 * Central Fleet Depot: (15, 85)
 * Central Waste Facility: (85, 85)
 */
function getNodePosition(node) {
    if (node === 'DEPOT') return { x: 15, y: 85, name: 'Central Fleet Depot' };
    if (node === 'FACILITY') return { x: 85, y: 85, name: 'Central Waste Facility' };
    return {
        x: Number(node.lng || node.x || 50),
        y: Number(node.lat || node.y || 50),
        name: node.location || node.id
    };
}

/**
 * Computes a realistic distance (km) between campus nodes.
 */
function getSegmentDistanceKm(nodeA, nodeB) {
    const pA = getNodePosition(nodeA);
    const pB = getNodePosition(nodeB);
    const dx = pA.x - pB.x;
    const dy = pA.y - pB.y;
    const rawDist = Math.hypot(dx, dy) * 0.016;
    return Math.max(0.18, Number(rawDist.toFixed(2)));
}

/**
 * Multi-Objective Route Optimization Algorithm:
 * Evaluates candidate bins balancing fill level urgency and transit distance.
 */
function optimizeCollectionRoute(candidateBins) {
    if (!candidateBins || candidateBins.length === 0) return { sequencedRoute: [], finalNode: 'DEPOT', totalPickupDist: 0 };

    const unvisited = [...candidateBins];
    const sequencedRoute = [];
    let currentPos = 'DEPOT';
    let cumulativeDist = 0;

    while (unvisited.length > 0) {
        let bestIndex = -1;
        let bestScore = -Infinity;
        let bestDist = 0;

        for (let i = 0; i < unvisited.length; i++) {
            const bin = unvisited[i];
            const fill = Number(bin.fillLevel) || 0;
            const dist = getSegmentDistanceKm(currentPos, bin);

            let urgencyMultiplier = 1.0;
            if (fill >= thresholds.critical) {
                urgencyMultiplier = 3.0;
            } else if (fill >= thresholds.warning) {
                urgencyMultiplier = 1.8;
            } else if (fill >= thresholds.medium || fill > thresholds.normal) {
                urgencyMultiplier = 1.2;
            } else {
                urgencyMultiplier = 1.0;
            }

            const score = (fill * urgencyMultiplier) / (dist * 45 + 10);

            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
                bestDist = dist;
            }
        }

        if (bestIndex >= 0) {
            const chosenBin = unvisited.splice(bestIndex, 1)[0];
            cumulativeDist += bestDist;
            sequencedRoute.push({
                bin: chosenBin,
                segmentDist: bestDist,
                cumulativeDist: Number(cumulativeDist.toFixed(2)),
                score: Number(bestScore.toFixed(1))
            });
            currentPos = chosenBin;
        }
    }

    return { sequencedRoute, finalNode: currentPos, totalPickupDist: cumulativeDist };
}

/**
 * buildRouteHTML — Priority sequenced route:
 * Central Depot ──> [Optimized Bins] ──> Central Waste Facility
 */
async function buildRouteHTML() {
    let routeData = null;
    let routingError = false;

    try {
        const response = await fetch(
            "https://smart-waste-backend-twjs.onrender.com/plan-route"
        );

        if (!response.ok) {
            throw new Error("Route planning request failed");
        }

        routeData = await response.json();
    } catch (error) {
        console.warn("Backend route service unavailable, using local heuristic:", error);
        routingError = true;
    }

    const dispatchThreshold = thresholds.medium;
    const eligibleBins = bins.filter(bin => Number(bin.fillLevel) >= dispatchThreshold);

    // State 1: Awaiting first sensor reading (no telemetry yet)
    if (bins.length === 0) {
        const emptyHtml = `
            <div class="empty-route-state awaiting">
                <i class='bx bx-sync bx-spin'></i>
                <h4>Awaiting Sensor Telemetry</h4>
                <p>No sensor telemetry available to generate collection route. Waiting for sensor nodes to report fill levels.</p>
            </div>
        `;
        return { html: emptyHtml, stopCount: null, criticalCount: null, totalDistKm: null, etaMinutes: null, source: 'none' };
    }

    // State 2: Active telemetry, but all bins are within safe limits
    if (eligibleBins.length === 0) {
        const emptyHtml = `
            <div class="empty-route-state nominal">
                <i class='bx bx-check-shield'></i>
                <h4>All Bins Below Collection Threshold</h4>
                <p>All ${bins.length} monitored campus bins are currently below collection threshold (<${dispatchThreshold}%). Collection vehicle remains on standby at Central Depot.</p>
            </div>
        `;
        return { html: emptyHtml, stopCount: 0, criticalCount: 0, totalDistKm: 0, etaMinutes: 0, source: 'standby' };
    }

    let sequencedRoute = [];
    let returnLegDist = 0.5;
    let totalRouteDist = 0;
    let totalMinutes = 0;
    let routePoints = [];

    if (routeData && Array.isArray(routeData.route) && routeData.route.length > 2) {
        const apiBins = routeData.route.filter(point => point.type === "bin");
        let currentPos = 'DEPOT';
        let cumulativeDist = 0;

        routePoints = apiBins.map((bin) => {
            const dist = getSegmentDistanceKm(currentPos, bin);
            cumulativeDist += dist;
            currentPos = bin;
            return {
                bin,
                segmentDist: dist,
                cumulativeDist: Number(cumulativeDist.toFixed(2)),
                score: Number((Number(bin.fillLevel || 0) / (dist * 45 + 10)).toFixed(1))
            };
        });

        const lastNode = apiBins.length > 0 ? apiBins[apiBins.length - 1] : 'DEPOT';
        returnLegDist = getSegmentDistanceKm(lastNode, 'FACILITY');
        totalRouteDist = Number((cumulativeDist + returnLegDist).toFixed(2));
        const drivingMinutes = (totalRouteDist / 20) * 60;
        const serviceMinutes = routePoints.length * 3;
        totalMinutes = Math.round(drivingMinutes + serviceMinutes + 4);
    } else {
        const optimized = optimizeCollectionRoute(eligibleBins);
        sequencedRoute = optimized.sequencedRoute;
        returnLegDist = getSegmentDistanceKm(optimized.finalNode, 'FACILITY');
        totalRouteDist = Number((optimized.totalPickupDist + returnLegDist).toFixed(2));
        const drivingMinutes = (totalRouteDist / 20) * 60;
        const serviceMinutes = sequencedRoute.length * 3;
        totalMinutes = Math.round(drivingMinutes + serviceMinutes + 4);
        routePoints = sequencedRoute;
    }

    let html = `
        <div class="route-node depot origin">
            <div class="route-node-spine">
                <span class="spine-icon">
                    <i class='bx bxs-institution'></i>
                </span>
                <span class="spine-connector"></span>
            </div>

            <div class="route-node-content">
                <div class="route-node-header">
                    <div class="route-badges-row">
                        <span class="route-badge depot">ORIGIN</span>
                        <span class="route-dist-badge"><i class='bx bx-play-circle'></i> 0.00 km</span>
                    </div>
                </div>

                <div class="route-node-name">
                    Central Fleet Depot
                </div>

                <span class="route-node-sub">
                    Collection vehicle departure &bull; Dispatch initialization
                </span>
            </div>
        </div>
    `;

    routePoints.forEach((step, index) => {
        const bin = step.bin || step;
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id ? bin.id.replace("BIN-", "") : (index + 1);

        html += `
            <div class="route-node ${status.className}" onclick="showBinDetails('${bin.id}')">
                <div class="route-node-spine">
                    <span class="spine-icon ${status.className}">
                        ${index + 1}
                    </span>
                    <span class="spine-connector"></span>
                </div>

                <div class="route-node-content">
                    <div class="route-node-header">
                        <div class="route-badges-row">
                            <span class="route-badge ${status.className}">Priority ${status.priority}</span>
                            <span class="route-dist-badge"><i class='bx bx-navigation'></i> +${step.segmentDist ?? 0} km</span>
                        </div>
                        <span class="route-node-fill ${status.className}">${bin.fillLevel}%</span>
                    </div>

                    <div class="route-node-name">
                        Bin ${binNumber} &bull; ${bin.location || 'Campus Location'}
                    </div>

                    <div class="route-node-footer">
                        <span class="route-metric-crumb"><i class='bx bx-trip'></i> Cum: <strong>${step.cumulativeDist ?? '0.00'} km</strong></span>
                        <span class="route-metric-crumb"><i class='bx bx-sort-up'></i> Score: <strong>${step.score ?? '—'}</strong></span>
                        <span><i class='bx bx-chip'></i> ${bin.sensorId || 'ESP32'}</span>
                        <span class="action-link">Inspect Node &rarr;</span>
                    </div>
                </div>
            </div>
        `;
    });

    // FINAL COLLECTION FACILITY
    html += `
        <div class="route-node depot destination">
            <div class="route-node-spine">
                <span class="spine-icon">
                    <i class='bx bxs-flag-checkered'></i>
                </span>
            </div>

            <div class="route-node-content">
                <div class="route-node-header">
                    <div class="route-badges-row">
                        <span class="route-badge depot">DESTINATION</span>
                        <span class="route-dist-badge"><i class='bx bx-navigation'></i> +${returnLegDist} km</span>
                    </div>
                </div>

                <div class="route-node-name">
                    Central Waste Facility
                </div>

                <span class="route-node-sub">
                    Waste unloading, compaction &bull; Return &bull; Total route: ${totalRouteDist} km
                </span>
            </div>
        </div>
    `;

    const criticalCount = routePoints.filter(item => {
        const fill = Number((item.bin || item).fillLevel);
        return fill >= thresholds.critical;
    }).length;

    return {
        html,
        stopCount: routePoints.length,
        criticalCount,
        totalDistKm: totalRouteDist,
        etaMinutes: totalMinutes,
        source: routingError ? 'fallback' : 'optimized'
    };
}

async function generateRoute() {
    const el = document.getElementById('routeContainer') || document.getElementById('routeContainerPage');
    if (!el) return;

    const { html } = await buildRouteHTML();
    el.innerHTML = html;
}

async function renderRoutePage() {
    const el = document.getElementById('routeContainerPage');
    if (!el) return;

    const { html, stopCount, criticalCount, totalDistKm, etaMinutes } = await buildRouteHTML();
    el.innerHTML = html;

    const stopsEl = document.getElementById('routeStops');
    const critEl = document.getElementById('routeCritical');
    const etaEl = document.getElementById('routeETA');
    const distEl = document.getElementById('routeDistance');

    if (stopCount === null) {
        if (stopsEl) stopsEl.textContent = '—';
        if (critEl) critEl.textContent = '—';
        if (etaEl) etaEl.textContent = '—';
        if (distEl) distEl.textContent = '—';
    } else if (stopCount === 0) {
        if (stopsEl) stopsEl.textContent = '0';
        if (critEl) critEl.textContent = '0';
        if (etaEl) etaEl.textContent = 'Standby';
        if (distEl) distEl.textContent = '0.0 km';
    } else {
        if (stopsEl) stopsEl.textContent = stopCount;
        if (critEl) critEl.textContent = criticalCount;
        const etaValue = Number.isFinite(etaMinutes) ? etaMinutes : stopCount * 6 + 12;
        const distanceValue = Number.isFinite(totalDistKm) ? totalDistKm : stopCount * 0.75 + 1.2;
        if (etaEl) etaEl.textContent = `~${etaValue} min`;
        if (distEl) distEl.textContent = `~${distanceValue.toFixed(1)} km`;
    }
}

/**
 * renderLocationDirectory — Clean structured campus location list (proper replacement for fake CSS map).
 */
function renderLocationDirectory() {
    const container = document.getElementById('mapPlaceholder');
    if (!container) return;

    const mapNodeCountBadge = document.getElementById('mapNodeCountBadge');
    if (mapNodeCountBadge) {
        if (bins.length === 0) {
            mapNodeCountBadge.innerHTML = `<span class="node-ping-dot paused"></span> No Nodes Reporting`;
            mapNodeCountBadge.className = "map-node-count-badge awaiting";
        } else {
            mapNodeCountBadge.innerHTML = `<span class="node-ping-dot"></span> ${bins.length} Active Nodes`;
            mapNodeCountBadge.className = "map-node-count-badge";
        }
    }

    if (bins.length === 0) {
        container.innerHTML = `
            <div class="directory-empty-state">
                <div class="directory-empty-icon"><i class='bx bx-sync bx-spin'></i></div>
                <div class="directory-empty-text">
                    <h4>Awaiting Sensor Telemetry</h4>
                    <p>No active devices currently reporting campus locations. Campus nodes will appear once data arrives from Firebase.</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="directory-list">
            ${bins.map(bin => {
                const status = getBinStatus(bin.fillLevel);
                const binNum = bin.id.replace("BIN-", "");
                return `
                    <div class="directory-item status-${status.className}" onclick="showBinDetails('${bin.id}')" title="Inspect node ${bin.id}">
                        <div class="directory-item-left">
                            <div class="dir-icon-badge ${status.className}">
                                <i class='bx bx-map-pin'></i>
                            </div>
                            <div class="dir-meta">
                                <div class="dir-loc-title">${bin.location || 'Campus Facility'}</div>
                                <div class="dir-sub-info">
                                    <span class="dir-bin-id">Bin ${binNum}</span>
                                    <span class="dir-sep">&bull;</span>
                                    <span class="dir-sensor-id">${bin.sensorId || 'ESP32'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="directory-item-right">
                            <div class="dir-fill-block">
                                <div class="dir-fill-track">
                                    <div class="dir-fill-bar ${status.className}" style="width: ${bin.fillLevel}%"></div>
                                </div>
                                <span class="dir-fill-pct ${status.className}">${bin.fillLevel}%</span>
                            </div>
                            <span class="dir-status-tag ${status.className}">${status.label}</span>
                            <button class="dir-inspect-btn" onclick="event.stopPropagation(); showBinDetails('${bin.id}')">
                                Inspect
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderMapMarkers() {
    renderLocationDirectory();
}

/**
 * renderChartIn — Horizontal telemetry fill bars for Analytics.
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

/**
 * renderEstimatesPage — Renders the Fill-Level Estimate table and projections.
 */
function renderEstimatesPage() {
    const tbody = document.getElementById('aiPredictionBody');
    if (!tbody) return;

    if (bins.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">Awaiting live sensor readings from Firebase to generate fill projections.</td>
            </tr>
        `;
        renderChartIn('analyticsChartWrapper');
        return;
    }

    tbody.innerHTML = bins.map(bin => {
        const status = getBinStatus(bin.fillLevel);
        const binNum = bin.id.replace("BIN-", "");
        const fill = Number(bin.fillLevel) || 0;

        let overflowEstimate = "—";
        let estTime = "—";
        if (fill >= thresholds.critical) {
            overflowEstimate = "Immediate (At Limit)";
            estTime = "< 1 hour";
        } else if (fill >= thresholds.warning) {
            overflowEstimate = "Today (Evening)";
            estTime = "~3 - 4 hours";
        } else if (fill >= thresholds.medium || fill > thresholds.normal) {
            overflowEstimate = "Tomorrow (Morning)";
            estTime = "~14 - 18 hours";
        } else {
            overflowEstimate = "Nominal (> 36h)";
            estTime = "> 36 hours";
        }

        return `
            <tr onclick="showBinDetails('${bin.id}')" title="Inspect node ${bin.id}" style="cursor: pointer;">
                <td><strong>Bin ${binNum}</strong> <span class="dim">(${bin.id})</span></td>
                <td>${bin.location}</td>
                <td><span class="table-pct ${status.className}">${fill}%</span></td>
                <td><span class="ai-forecast-badge ${status.className}">${overflowEstimate}</span></td>
                <td>${estTime}</td>
                <td><span class="risk-badge ${status.className}">${status.risk}</span></td>
            </tr>
        `;
    }).join('');

    renderChartIn('analyticsChartWrapper');
}

function renderAnalyticsPage() {
    renderEstimatesPage();
}

/**
 * renderAIPage — Dedicated renderer for the Collection Route workspace.
 */
function renderAIPage() {
    renderRoutePage();
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

    updateThresholdLabels();
}

function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('lastUpdate');
    if (dateEl) dateEl.textContent = formatDate(now);
    if (timeEl) {
        if (lastSyncTime) {
            timeEl.textContent = formatTime(lastSyncTime);
        } else if (bins.length > 0) {
            timeEl.textContent = formatTime(now);
        } else {
            timeEl.textContent = "Awaiting sync";
        }
    }
}

function renderAll(forceCountAnimation = false) {
    updateDateTime();
    updateSummary(forceCountAnimation);
    renderBins(bins);
    renderAlerts();
    renderMapMarkers();

    // Re-render active page if non-dashboard
    if (currentPage !== 'dashboard') {
        navigateToPage(currentPage);
    }
}


/* ============================================================
   4. PAGE NAVIGATION & SWITCHING
   ============================================================ */
let currentPage = 'dashboard';

function navigateToPage(pageName) {
    if (pageName === 'route') pageName = 'ai';
    if (pageName === 'analytics') pageName = 'estimates';

    // Update header title and subtitle based on current workspace
    const headingEl = document.getElementById('pageTitleHeading');
    const subtitleEl = document.getElementById('pageSubtitle');
    if (pageTitles[pageName]) {
        if (headingEl) headingEl.textContent = pageTitles[pageName].title;
        if (subtitleEl) subtitleEl.textContent = pageTitles[pageName].subtitle;
    }

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const target = document.getElementById(`page-${pageName}`);
    if (target) {
        target.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName || (pageName === 'estimates' && link.dataset.page === 'analytics')) {
            link.classList.add('active');
        }
    });

    switch (pageName) {
        case 'bins':
            renderBinsPage(bins);
            break;
        case 'estimates':
        case 'analytics':
            renderEstimatesPage();
            break;
        case 'ai':
        case 'route':
            renderAIPage();
            break;
        case 'settings':
            renderSettingsPage();
            break;
    }

    currentPage = pageName;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ============================================================
   5. FILTERING, SEARCH, MODAL INSPECTION & THEME
   ============================================================ */
function getFilteredBins(filterType, searchText) {
    let filtered = bins;

    if (filterType !== 'all') {
        filtered = filtered.filter(bin => {
            const status = getBinStatus(bin.fillLevel);
            if (filterType === 'nearly-full' || filterType === 'warning') {
                return status.className === 'warning';
            }
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
    if (modalUpdated) modalUpdated.textContent = formatSensorTimestamp(bin.lastUpdated);
    if (modalSens) modalSens.textContent = bin.sensorId || 'ESP32-CORE';

    if (modalStat) {
        modalStat.textContent = status.label;
        modalStat.style.color = `var(--status-${status.className})`;
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

function showThresholdFeedback(message, type = 'success') {
    const fb = document.getElementById('thresholdFeedback');
    if (!fb) return;
    fb.className = `threshold-feedback-msg ${type}`;
    fb.innerHTML = type === 'success' ? `<i class='bx bx-check-circle'></i> ${message}` : `<i class='bx bx-error-circle'></i> ${message}`;
    fb.style.display = 'flex';
    setTimeout(() => {
        if (fb) fb.style.display = 'none';
    }, 4500);
}

function updateSettingsPreviewFromInputs() {
    const inpNorm = document.getElementById('thresholdNormal');
    const inpMed = document.getElementById('thresholdMedium');
    const inpWarn = document.getElementById('thresholdWarning');
    const inpCrit = document.getElementById('thresholdCritical');

    const n = Math.max(1, Math.min(99, parseInt(inpNorm?.value, 10) || thresholds.normal));
    const m = Math.max(1, Math.min(99, parseInt(inpMed?.value, 10) || thresholds.medium));
    const w = Math.max(1, Math.min(99, parseInt(inpWarn?.value, 10) || thresholds.warning));
    const c = Math.max(1, Math.min(100, parseInt(inpCrit?.value, 10) || thresholds.critical));

    const pNorm = document.getElementById('previewRangeNormal');
    const pMed = document.getElementById('previewRangeMedium');
    const pWarn = document.getElementById('previewRangeWarning');
    const pCrit = document.getElementById('previewRangeCritical');

    const medStart = n + 1;
    const medEnd = w - 1;

    if (pNorm) pNorm.textContent = `0% – ${n}%`;
    if (pMed) pMed.textContent = `${medStart}% – ${medEnd}%`;
    if (pWarn) pWarn.textContent = `${w}% – ${c - 1}%`;
    if (pCrit) pCrit.textContent = `≥ ${c}%`;
}

function saveThresholds() {
    const inputNormal = document.getElementById('thresholdNormal');
    const inputMedium = document.getElementById('thresholdMedium');
    const inputWarning = document.getElementById('thresholdWarning');
    const inputCritical = document.getElementById('thresholdCritical');

    const n = parseInt(inputNormal?.value, 10);
    const m = parseInt(inputMedium?.value, 10);
    const w = parseInt(inputWarning?.value, 10);
    const c = parseInt(inputCritical?.value, 10);

    if (isNaN(n) || isNaN(m) || isNaN(w) || isNaN(c)) {
        showThresholdFeedback("All 4 thresholds must be valid numbers.", "error");
        return;
    }

    if (n < 1 || n > 99 || m < 1 || m > 99 || w < 1 || w > 99 || c < 1 || c > 100) {
        showThresholdFeedback("Threshold values must be between 1% and 100%.", "error");
        return;
    }

    if (n >= w || m >= w || w >= c) {
        showThresholdFeedback("Thresholds must follow logical order: Normal < Warning < Critical.", "error");
        return;
    }

    thresholds = { normal: n, medium: m, warning: w, critical: c };

    try {
        localStorage.setItem('swm-thresholds', JSON.stringify(thresholds));
    } catch (e) {
        console.warn("Could not persist thresholds to localStorage:", e);
    }

    updateThresholdLabels();
    renderAll(true);
    generateRoute();
    renderRoutePage();

    showThresholdFeedback("Threshold preferences updated across the platform.", "success");
}

function resetThresholdsDefault() {
    thresholds = { ...DEFAULT_THRESHOLDS };
    try {
        localStorage.removeItem('swm-thresholds');
    } catch (e) {}

    updateThresholdLabels();
    renderAll(true);
    generateRoute();
    renderRoutePage();

    showThresholdFeedback("Thresholds reset to defaults (Safe: 40%, Medium: 60%, Warning: 80%, Critical: 90%).", "success");
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
        localStorage.setItem('swm-theme-mode', isDark ? 'dark' : 'light');
    } catch (e) {}
    updateThemeUI(isDark);
}

function initTheme() {
    let savedTheme = null;
    try {
        savedTheme = localStorage.getItem('swm-theme-mode');
        if (!savedTheme) {
            // Clean up legacy cached values so default is guaranteed Light mode
            localStorage.removeItem('swm-theme');
            savedTheme = 'light';
            localStorage.setItem('swm-theme-mode', 'light');
        }
    } catch (e) {}

    // Default to clean warm off-white light theme
    const isDark = (savedTheme === 'dark');

    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    updateThemeUI(isDark);
}



/* ============================================================
   6. INITIALIZATION & EVENT HANDLERS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateFirebaseSyncUI('awaiting');
    updateThresholdLabels();
    renderAll(true);

    // Live preview update as user edits threshold inputs
    ['thresholdNormal', 'thresholdMedium', 'thresholdWarning', 'thresholdCritical'].forEach(id => {
        const inp = document.getElementById(id);
        if (inp) {
            inp.addEventListener('input', updateSettingsPreviewFromInputs);
        }
    });

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

    // Refresh sync buttons (desktop & mobile)
    function handleRefreshAction(btn) {
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.add('bx-spin');
            setTimeout(() => icon.classList.remove('bx-spin'), 700);
        }
        renderAll(true);
    }

    const refreshBtn = document.getElementById('btnRefresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => handleRefreshAction(refreshBtn));
    }

    const mobileRefreshBtn = document.getElementById('mobileRefreshBtn');
    if (mobileRefreshBtn) {
        mobileRefreshBtn.addEventListener('click', () => handleRefreshAction(mobileRefreshBtn));
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