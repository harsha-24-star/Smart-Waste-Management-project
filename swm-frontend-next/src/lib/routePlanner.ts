import type { Bin, ThresholdConfig, StatusTier } from '../types';
import { getBinStatus } from './status.ts';
import { getBinFreshness } from './telemetry.ts';

/**
 * CAMPUS GRID COORDINATE SYSTEM (0–100 Scale)
 * Note: These are abstract campus layout coordinates, NOT physical GPS or geographic coordinates.
 */
export interface CampusPoint {
  x: number;
  y: number;
  name: string;
}

export interface CampusFacilityConfig {
  depot: CampusPoint;
  facility: CampusPoint;
}

/**
 * DEFAULT REFERENCE CAMPUS GRID COORDINATES (0–100 Scale)
 * Synthetic reference coordinates for the campus prototype layout.
 * Configurable; not physical GPS locations.
 */
export const DEFAULT_CAMPUS_FACILITIES: CampusFacilityConfig = {
  depot: { x: 15, y: 85, name: 'Central Fleet Depot (Synthetic Reference)' },
  facility: { x: 85, y: 85, name: 'Central Waste Facility (Synthetic Reference)' },
};

export interface RouteWaypoint {
  bin: Bin;
  segmentDist: number;       // Distance from preceding stop in campus distance units
  cumulativeDist: number;    // Cumulative tour distance from depot in campus distance units
  score: number;             // Recorded fill level percentage
  tier: StatusTier;          // 'critical' | 'warning' | 'medium' | 'normal'
  isCritical: boolean;       // true if bin.fillLevel >= thresholds.critical
}

export interface ExcludedBin {
  bin: Bin;
  reason: string;
  category: 'stale_telemetry' | 'invalid_coordinates' | 'invalid_fill';
}

export interface OptimizedRouteResult {
  waypoints: RouteWaypoint[];
  totalDistanceUnits: number;
  totalDistanceKm: number;    // Backward compatibility alias (= totalDistanceUnits)
  estimatedMinutes: number;
  criticalCount: number;
  returnLegDistUnits: number;
  returnLegDistKm: number;    // Backward compatibility alias (= returnLegDistUnits)
  isExactOptimization: boolean;
  statusMessage: string;
  excludedBins: ExcludedBin[];
}

/**
 * Validates campus 2D coordinates.
 * Coordinates are mapped from bin.lng (X-axis) and bin.lat (Y-axis) in range [0, 100].
 */
export function hasValidCoordinates(bin: Bin): boolean {
  if (bin.lng === undefined || bin.lng === null || bin.lat === undefined || bin.lat === null) {
    return false;
  }
  const x = Number(bin.lng);
  const y = Number(bin.lat);
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 100 && y >= 0 && y <= 100;
}

/**
 * Validates fill level as a finite percentage in [0, 100].
 */
export function hasValidFillLevel(bin: Bin): boolean {
  if (bin.fillLevel === undefined || bin.fillLevel === null) {
    return false;
  }
  const fill = Number(bin.fillLevel);
  return Number.isFinite(fill) && fill >= 0 && fill <= 100;
}

/**
 * Validates telemetry freshness using existing getBinFreshness rules.
 */
export function isBinFresh(bin: Bin): boolean {
  if (!bin.lastUpdated || bin.lastUpdated.trim() === '') {
    return false;
  }
  const freshness = getBinFreshness(bin.id, bin.lastUpdated);
  return !freshness.isStale && freshness.status !== 'offline' && freshness.status !== 'stale';
}

/**
 * Extracts validated position of a campus node or reference facility.
 * Throws an explicit error on missing or invalid coordinates.
 */
export function getCampusNodePosition(
  node: Bin | 'DEPOT' | 'FACILITY',
  facilities: CampusFacilityConfig = DEFAULT_CAMPUS_FACILITIES
): CampusPoint {
  if (node === 'DEPOT') return facilities.depot;
  if (node === 'FACILITY') return facilities.facility;

  if (!hasValidCoordinates(node)) {
    throw new Error(
      `Invalid campus coordinates for bin "${node.id}": lng(x)=${node.lng}, lat(y)=${node.lat}. Coordinates must be finite numbers in [0, 100].`
    );
  }

  return {
    x: Number(node.lng),
    y: Number(node.lat),
    name: node.location || node.id,
  };
}

/**
 * Calculates Euclidean distance between two nodes in normalized campus distance units.
 * Note: Does not claim real-world driving distance (no physical road network calibrated).
 */
export function getCampusDistance(
  nodeA: Bin | 'DEPOT' | 'FACILITY',
  nodeB: Bin | 'DEPOT' | 'FACILITY',
  facilities: CampusFacilityConfig = DEFAULT_CAMPUS_FACILITIES
): number {
  const pA = getCampusNodePosition(nodeA, facilities);
  const pB = getCampusNodePosition(nodeB, facilities);
  const dx = pA.x - pB.x;
  const dy = pA.y - pB.y;
  return Math.hypot(dx, dy);
}

/**
 * Backward compatibility alias for getCampusDistance.
 */
export function getCampusDistanceKm(
  nodeA: Bin | 'DEPOT' | 'FACILITY',
  nodeB: Bin | 'DEPOT' | 'FACILITY',
  facilities: CampusFacilityConfig = DEFAULT_CAMPUS_FACILITIES
): number {
  return getCampusDistance(nodeA, nodeB, facilities);
}

/**
 * Computes complete tour distance:
 * Depot -> stops[0] -> stops[1] -> ... -> stops[n-1] -> Facility
 */
export function computeCompleteRouteDistance(
  stops: Bin[],
  facilities: CampusFacilityConfig = DEFAULT_CAMPUS_FACILITIES
): number {
  if (!stops || stops.length === 0) return 0;
  let total = getCampusDistance('DEPOT', stops[0], facilities);
  for (let i = 0; i < stops.length - 1; i++) {
    total += getCampusDistance(stops[i], stops[i + 1], facilities);
  }
  total += getCampusDistance(stops[stops.length - 1], 'FACILITY', facilities);
  return total;
}

/**
 * Generates all permutations of an array.
 */
export function getPermutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const perms: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const sub of getPermutations(rest)) {
      perms.push([item, ...sub]);
    }
  }
  return perms;
}

export const EXACT_OPTIMIZATION_LIMIT = 6;

/**
 * Solves the critical-first route optimization problem:
 * 1. Depot -> Critical bins (in shortest order) -> Non-critical bins (in shortest order) -> Facility.
 * 2. Accounts for transition from critical to non-critical and final leg to facility.
 * 3. Uses exact permutation search if total eligible bins <= 6.
 * 4. Uses documented nearest-neighbor fallback with critical-first partitioning if > 6.
 */
export function solveCriticalFirstRoute(
  criticalBins: Bin[],
  nonCriticalBins: Bin[],
  facilities: CampusFacilityConfig = DEFAULT_CAMPUS_FACILITIES
): { orderedStops: Bin[]; isExact: boolean } {
  const totalStops = criticalBins.length + nonCriticalBins.length;

  if (totalStops === 0) {
    return { orderedStops: [], isExact: true };
  }

  // Exact permutation search when eligible stops <= 6
  if (totalStops <= EXACT_OPTIMIZATION_LIMIT) {
    const criticalPerms = getPermutations(criticalBins);
    const nonCriticalPerms = getPermutations(nonCriticalBins);

    let bestOrder: Bin[] = [];
    let minDistance = Infinity;

    for (const cPerm of criticalPerms) {
      for (const mPerm of nonCriticalPerms) {
        const candidateRoute = [...cPerm, ...mPerm];
        const dist = computeCompleteRouteDistance(candidateRoute, facilities);
        if (dist < minDistance) {
          minDistance = dist;
          bestOrder = candidateRoute;
        }
      }
    }

    return { orderedStops: bestOrder, isExact: true };
  }

  // Documented Fallback for > 6 bins: Nearest-neighbor with mandatory critical-first partition
  const orderedStops: Bin[] = [];
  let currentPos: Bin | 'DEPOT' = 'DEPOT';

  // Phase 1: Critical stops
  const unvisitedCritical = [...criticalBins];
  while (unvisitedCritical.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < unvisitedCritical.length; i++) {
      const d = getCampusDistance(currentPos, unvisitedCritical[i], facilities);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const chosen = unvisitedCritical.splice(bestIdx, 1)[0];
    orderedStops.push(chosen);
    currentPos = chosen;
  }

  // Phase 2: Non-critical stops
  const unvisitedNonCritical = [...nonCriticalBins];
  while (unvisitedNonCritical.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < unvisitedNonCritical.length; i++) {
      const d = getCampusDistance(currentPos, unvisitedNonCritical[i], facilities);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const chosen = unvisitedNonCritical.splice(bestIdx, 1)[0];
    orderedStops.push(chosen);
    currentPos = chosen;
  }

  return { orderedStops, isExact: false };
}

/**
 * Optimizes collection route for candidate bins subject to:
 * - Data validity (fill level in [0, 100], coordinates in [0, 100])
 * - Freshness check (stale/offline readings excluded and reported)
 * - Collection threshold (fillLevel >= thresholds.medium)
 * - Mandatory critical-first sequencing (critical bins visited before non-critical)
 * - Complete tour minimization (Depot -> All Stops -> Facility)
 */
export function optimizeRoute(
  candidateBins: Bin[],
  thresholds: ThresholdConfig,
  facilities: CampusFacilityConfig = DEFAULT_CAMPUS_FACILITIES
): OptimizedRouteResult {
  if (!candidateBins || candidateBins.length === 0) {
    return {
      waypoints: [],
      totalDistanceUnits: 0,
      totalDistanceKm: 0,
      estimatedMinutes: 0,
      criticalCount: 0,
      returnLegDistUnits: 0,
      returnLegDistKm: 0,
      isExactOptimization: true,
      statusMessage: 'No telemetry bins provided to route planner.',
      excludedBins: [],
    };
  }

  const excludedBins: ExcludedBin[] = [];
  const eligibleCritical: Bin[] = [];
  const eligibleNonCritical: Bin[] = [];

  for (const bin of candidateBins) {
    // 1. Fill level validation
    if (!hasValidFillLevel(bin)) {
      excludedBins.push({
        bin,
        category: 'invalid_fill',
        reason: `Invalid fill level (${bin.fillLevel}%). Must be a finite number between 0 and 100.`,
      });
      continue;
    }

    // 2. Coordinate validation
    if (!hasValidCoordinates(bin)) {
      excludedBins.push({
        bin,
        category: 'invalid_coordinates',
        reason: `Missing or out-of-range campus grid coordinates (lng/x=${bin.lng}, lat/y=${bin.lat}). Must be in [0, 100].`,
      });
      continue;
    }

    // 3. Stale / offline telemetry check
    if (!isBinFresh(bin)) {
      const freshness = getBinFreshness(bin.id, bin.lastUpdated);
      excludedBins.push({
        bin,
        category: 'stale_telemetry',
        reason: `Telemetry ${freshness.status} (${freshness.displayText || 'no reading'}). Requires physical verification.`,
      });
      continue;
    }

    // 4. Collection eligibility threshold check (default 60%)
    if (bin.fillLevel < thresholds.medium) {
      // Below dispatch threshold; nominal operating level, not an exclusion error
      continue;
    }

    // 5. Partition into critical (>= 90%) vs non-critical (< 90%)
    if (bin.fillLevel >= thresholds.critical) {
      eligibleCritical.push(bin);
    } else {
      eligibleNonCritical.push(bin);
    }
  }

  const { orderedStops, isExact } = solveCriticalFirstRoute(
    eligibleCritical,
    eligibleNonCritical,
    facilities
  );

  const waypoints: RouteWaypoint[] = [];
  let cumulativeDist = 0;
  let prevNode: Bin | 'DEPOT' = 'DEPOT';

  for (const bin of orderedStops) {
    const segmentDist = getCampusDistance(prevNode, bin, facilities);
    cumulativeDist += segmentDist;
    const isCritical = bin.fillLevel >= thresholds.critical;
    const status = getBinStatus(bin.fillLevel, thresholds);

    waypoints.push({
      bin,
      segmentDist: Number(segmentDist.toFixed(1)),
      cumulativeDist: Number(cumulativeDist.toFixed(1)),
      score: bin.fillLevel,
      tier: status.tier,
      isCritical,
    });

    prevNode = bin;
  }

  const lastStop: Bin | 'DEPOT' = waypoints.length > 0 ? waypoints[waypoints.length - 1].bin : 'DEPOT';
  const returnLegDistUnits = waypoints.length > 0 ? getCampusDistance(lastStop, 'FACILITY', facilities) : 0;
  const totalDistanceUnits = Number((cumulativeDist + returnLegDistUnits).toFixed(1));

  // Servicing estimate: 3 min servicing per stop + 0.4 min transit per campus distance unit
  const estimatedMinutes = waypoints.length > 0
    ? Math.round(waypoints.length * 3 + totalDistanceUnits * 0.4)
    : 0;

  const totalEligible = eligibleCritical.length + eligibleNonCritical.length;
  let statusMessage = `All monitored bins within normal limits (<${thresholds.medium}%).`;
  if (totalEligible > 0) {
    statusMessage = isExact
      ? `Exact optimal route (${totalEligible} stops) satisfying mandatory critical-first constraint.`
      : `Heuristic route (${totalEligible} stops, >6 limit fallback) with critical-first constraint.`;
  }

  return {
    waypoints,
    totalDistanceUnits,
    totalDistanceKm: totalDistanceUnits,
    estimatedMinutes,
    criticalCount: eligibleCritical.length,
    returnLegDistUnits: Number(returnLegDistUnits.toFixed(1)),
    returnLegDistKm: Number(returnLegDistUnits.toFixed(1)),
    isExactOptimization: isExact,
    statusMessage,
    excludedBins,
  };
}
