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


const pageTitles = {
    dashboard: { title: "Operations Command Center",        subtitle: "Real-time ultrasonic telemetry, IoT fleet monitoring, and live hardware diagnostics" },
    bins:      { title: "Smart Bins & Hardware Nodes",      subtitle: "Live ultrasonic sensor telemetry, fill diagnostics, and hardware health" },
    analytics: { title: "Analytics & Telemetry",            subtitle: "Campus waste velocity metrics, fill distribution, and capacity comparison" },
    ai:        { title: "AI Intelligence & Autonomous Dispatch", subtitle: "Neural fill velocity forecasting, overflow prediction, and dynamic priority routing" },
    settings:  { title: "Platform Architecture & Config",   subtitle: "Sensor thresholds, notification rules, and Firebase cloud integration" },
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

    // 2. Map Legend
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
 * updateSummary — Updates header stats & the 5 executive summary cards (Total, Normal, Medium, Warning, Critical).
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

    animateCounter('totalBins', totalCount, 800, forceFromZero);
    animateCounter('normalBins', normal, 800, forceFromZero);
    animateCounter('mediumBins', medium, 800, forceFromZero);
    animateCounter('nearlyFullBins', warning, 800, forceFromZero);
    animateCounter('criticalBins', critical, 800, forceFromZero);

    // Sync metric pill threshold texts with current active thresholds
    updateThresholdLabels();

    // Header fleet tag & sensors tag
    const headerFleet = document.getElementById('headerFleetVal');
    if (headerFleet) headerFleet.innerHTML = `<i class='bx bx-chip'></i> ${totalCount} Nodes`;

    const sensorsOnline = document.getElementById('sensorsOnline');
    if (sensorsOnline) sensorsOnline.textContent = `${totalCount} / ${totalCount}`;

    // System Health calculation (100% minus penalty for criticals and warnings)
    const healthVal = document.getElementById('headerHealthVal');
    if (healthVal) {
        const healthPct = totalCount === 0 ? 100 : Math.max(70, Math.round(100 - (critical * 5) - (warning * 2) - (medium * 0.5)));
        healthVal.innerHTML = `<i class='bx bx-pulse'></i> ${healthPct}%`;
        healthVal.className = healthPct >= 90 ? 'h-metric-val health-good' : 'h-metric-val health-warn';
    }

    // Radial ring (safe normal ratio)
    const normalRing = document.getElementById('normalRingProgress');
    if (normalRing && totalCount > 0) {
        const pct = normal / totalCount;
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
        .filter(bin => Number(bin.fillLevel) >= thresholds.warning)
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
                    <p>No critical fill or capacity warning thresholds exceeded (&lt;${thresholds.warning}%). Realtime ultrasonic monitoring is actively scanning.</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = alertBins.map(bin => {
        const isCritical = Number(bin.fillLevel) >= thresholds.critical;
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

/* ============================================================
   CAMPUS DISTANCE SYSTEM & AI MULTI-OBJECTIVE ROUTE PLANNER
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
 * Computes a realistic small fixed distance (km) between any two campus nodes.
 * Scaling produces short hops between ~0.2 km (200m) and ~1.2 km (1200m).
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
 * Evaluates candidate bins balancing:
 *   1. Overflow Urgency / Fill Percentage: Higher fill bins require urgent servicing.
 *   2. Proximity / Travel Distance: Minimizes deadhead travel mileage from current vehicle position.
 *
 * Algorithm chooses the next optimal stop by maximizing:
 *   OptimizationScore = (FillLevel * UrgencyWeight) / (DistanceKm * 45 + 10)
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

            // Urgency factor exponentially rewards critical overflow risks based on thresholds
            let urgencyMultiplier = 1.0;
            if (fill >= thresholds.critical) {
                urgencyMultiplier = 3.0; // Critical emergency priority
            } else if (fill >= thresholds.warning) {
                urgencyMultiplier = 1.8; // High warning threshold
            } else if (fill >= thresholds.medium || fill > thresholds.normal) {
                urgencyMultiplier = 1.2; // Moderate priority pickup
            } else {
                urgencyMultiplier = 1.0; // Routine pickup
            }

            // Balanced Multi-Objective Score: Higher fill increases score, higher distance penalizes
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
 * buildRouteHTML — Connected multi-objective node graph:
 * Central Depot ──> [Optimized Bins (Distance + Fill%)] ──> Central Waste Facility
 */
async function buildRouteHTML() {
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
    }

    // Candidate bins for collection dispatch: bins that reached medium/collection threshold
    const dispatchThreshold = thresholds.medium;
    const eligibleBins = bins.filter(bin => Number(bin.fillLevel) >= dispatchThreshold);

    let sequencedRoute = [];
    let returnLegDist = 0.5;
    let totalRouteDist = 0;
    let totalMinutes = 0;
    let routePoints = [];

    if (routeData && Array.isArray(routeData.route) && routeData.route.length > 2) {
        const apiBins = routeData.route.filter(point => point.type === "bin");
        let currentPos = 'DEPOT';
        let cumulativeDist = 0;

        routePoints = apiBins.map((bin, index) => {
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
        if (eligibleBins.length === 0) {
            const emptyHtml = `
                <div class="empty-route-state">
                    <i class='bx bx-check-circle'></i>
                    <p>All monitored campus bins are below collection dispatch threshold (&lt;${dispatchThreshold}%). Fleet is on standby at Central Depot.</p>
                </div>
            `;
            return { html: emptyHtml, stopCount: 0, criticalCount: 0, totalDistKm: 0, etaMinutes: 0 };
        }

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
                <span class="route-badge depot">START POINT</span>
                <span class="route-dist-badge origin"><i class='bx bx-play-circle'></i> 0.00 km</span>

                <div class="route-node-name">
                    Central Fleet Depot
                </div>

                <span class="route-node-sub">
                    Collection vehicle departure &amp; logistics check &amp; dispatch initialization
                </span>
            </div>
        </div>
    `;

    routePoints.forEach((step, index) => {
        const bin = step.bin || step;
        const status = getBinStatus(bin.fillLevel);
        const binNumber = bin.id ? bin.id.replace("BIN-", "") : (index + 1);

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
                        <span class="route-metric-crumb"><i class='bx bx-brain'></i> AI Score: <strong>${step.score ?? '—'}</strong></span>
                        <span><i class='bx bx-chip'></i> ${bin.sensorId || 'ESP32'}</span>
                        <span class="action-link">View Details &rarr;</span>
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
                <span class="route-badge depot">COLLECTION POINT</span>
                <span class="route-dist-badge return"><i class='bx bx-navigation'></i> +${returnLegDist} km</span>

                <div class="route-node-name">
                    Central Waste Facility
                </div>

                <span class="route-node-sub">
                    Waste unloading, compaction &amp; depot return &amp; total route: ${totalRouteDist} km
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
        etaMinutes: totalMinutes
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
    if (stopsEl) {
        stopsEl.textContent = stopCount;
    }

    const critEl = document.getElementById('routeCritical');
    if (critEl) {
        critEl.textContent = criticalCount;
    }

    const etaEl = document.getElementById('routeETA');
    const etaValue = Number.isFinite(etaMinutes) ? etaMinutes : stopCount * 6 + 12;
    const distanceValue = Number.isFinite(totalDistKm) ? totalDistKm : stopCount * 0.75 + 1.2;

    if (etaEl) etaEl.textContent = stopCount === 0 ? '~0 min' : `~${etaValue} min`;

    const distEl = document.getElementById('routeDistance');
    if (distEl) distEl.textContent = stopCount === 0 ? '~0.0 km' : `~${distanceValue.toFixed(1)} km`;
}
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

    // 2. Autonomous Dispatch Optimizer (Connected Waypoint Loop & Dispatch KPIs)
    renderRoutePage();
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
 * renderSettingsPage — Hardware & configuration state.
 */
function renderSettingsPage() {
    const isDark = document.body.classList.contains('dark-theme');
    const toggle = document.getElementById('settingsDarkModeToggle');
    if (toggle) toggle.checked = isDark;

    const label = document.getElementById('currentThemeLabel');
    if (label) label.textContent = isDark ? 'Dark' : 'Light';

    // Populate active threshold inputs & breakdown
    updateThresholdLabels();
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
    renderMapMarkers();

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
    if (pageName === 'route') pageName = 'ai';

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

    switch (pageName) {
        case 'bins':
            renderBinsPage(bins);
            break;
        case 'analytics':
            renderAnalyticsPage();
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

    // Update dynamic threshold labels across all pages
    updateThresholdLabels();

    // Re-render Dashboard, Bins, Alerts, and Analytics
    renderAll(true);

    // Re-calculate Route Optimization
    generateRoute();
    renderRoutePage();

    showThresholdFeedback("Threshold preferences updated! Dashboard, Smart Bins, and Route Optimization have synced.", "success");
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

    showThresholdFeedback("Thresholds reset to defaults (Normal: 40%, Medium: 60%, Warning: 80%, Critical: 90%).", "success");
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
