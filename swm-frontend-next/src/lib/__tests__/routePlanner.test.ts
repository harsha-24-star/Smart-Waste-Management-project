import test from 'node:test';
import assert from 'node:assert';
import type { Bin, ThresholdConfig } from '../../types';
import { optimizeRoute } from '../routePlanner.ts';

const mockThresholds: ThresholdConfig = {
  normal: 40,
  medium: 60,
  warning: 80,
  critical: 90,
};

// Fresh timestamp helper (e.g. 5 seconds ago ISO string)
function freshTimestamp(): string {
  return new Date(Date.now() - 5000).toISOString();
}

// Stale timestamp helper (e.g. 2 hours ago ISO string)
function staleTimestamp(): string {
  return new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
}

test('1. Critical bins always precede all non-critical collection bins', () => {
  const bins: Bin[] = [
    { id: 'BIN-NC1', fillLevel: 75, location: 'Loc 1', lastUpdated: freshTimestamp(), lat: 20, lng: 20, nodeType: 'simulated' },
    { id: 'BIN-CR1', fillLevel: 95, location: 'Loc 2', lastUpdated: freshTimestamp(), lat: 40, lng: 40, nodeType: 'simulated' },
    { id: 'BIN-NC2', fillLevel: 65, location: 'Loc 3', lastUpdated: freshTimestamp(), lat: 60, lng: 60, nodeType: 'simulated' },
    { id: 'BIN-CR2', fillLevel: 92, location: 'Loc 4', lastUpdated: freshTimestamp(), lat: 80, lng: 30, nodeType: 'simulated' },
  ];

  const result = optimizeRoute(bins, mockThresholds);

  assert.strictEqual(result.waypoints.length, 4);
  assert.strictEqual(result.criticalCount, 2);

  // First 2 stops MUST be critical
  assert.ok(result.waypoints[0].bin.fillLevel >= mockThresholds.critical, 'Stop 1 must be critical');
  assert.ok(result.waypoints[1].bin.fillLevel >= mockThresholds.critical, 'Stop 2 must be critical');

  // Next 2 stops MUST be non-critical
  assert.ok(result.waypoints[2].bin.fillLevel < mockThresholds.critical, 'Stop 3 must be non-critical');
  assert.ok(result.waypoints[3].bin.fillLevel < mockThresholds.critical, 'Stop 4 must be non-critical');
});

test('2. The selected route has the minimum complete distance among valid critical-first permutations', () => {
  // Depot at (15, 85), Facility at (85, 85)
  // Non-critical bins arranged linearly:
  // NC1 at (25, 85), NC2 at (50, 85), NC3 at (75, 85)
  // Optimal order from Depot -> Facility is NC1 -> NC2 -> NC3
  const bins: Bin[] = [
    { id: 'BIN-NC3', fillLevel: 70, location: 'East', lastUpdated: freshTimestamp(), lat: 85, lng: 75, nodeType: 'simulated' },
    { id: 'BIN-NC1', fillLevel: 70, location: 'West', lastUpdated: freshTimestamp(), lat: 85, lng: 25, nodeType: 'simulated' },
    { id: 'BIN-NC2', fillLevel: 70, location: 'Mid', lastUpdated: freshTimestamp(), lat: 85, lng: 50, nodeType: 'simulated' },
  ];

  const result = optimizeRoute(bins, mockThresholds);

  // Optimal order: NC1 (25) -> NC2 (50) -> NC3 (75) -> Facility (85)
  assert.strictEqual(result.waypoints[0].bin.id, 'BIN-NC1');
  assert.strictEqual(result.waypoints[1].bin.id, 'BIN-NC2');
  assert.strictEqual(result.waypoints[2].bin.id, 'BIN-NC3');

  // Total distance:
  // Depot(15,85) -> NC1(25,85) = 10
  // NC1(25,85) -> NC2(50,85) = 25
  // NC2(50,85) -> NC3(75,85) = 25
  // NC3(75,85) -> Facility(85,85) = 10
  // Total = 70.0 campus distance units
  assert.strictEqual(result.totalDistanceUnits, 70.0);
});

test('3. The final facility leg is included in optimization', () => {
  // Depot at (15, 85), Facility at (85, 85)
  // Two non-critical bins:
  // A: (30, 85) - near Depot
  // B: (80, 85) - near Facility
  // Route A -> B: Depot(15) -> A(30) [15] -> B(80) [50] -> Facility(85) [5] = 70 units
  // Route B -> A: Depot(15) -> B(80) [65] -> A(30) [50] -> Facility(85) [55] = 170 units
  const bins: Bin[] = [
    { id: 'BIN-B', fillLevel: 65, location: 'Near Facility', lastUpdated: freshTimestamp(), lat: 85, lng: 80, nodeType: 'simulated' },
    { id: 'BIN-A', fillLevel: 65, location: 'Near Depot', lastUpdated: freshTimestamp(), lat: 85, lng: 30, nodeType: 'simulated' },
  ];

  const result = optimizeRoute(bins, mockThresholds);

  // Must choose A -> B because ending at B drastically shortens return leg to Facility
  assert.strictEqual(result.waypoints[0].bin.id, 'BIN-A');
  assert.strictEqual(result.waypoints[1].bin.id, 'BIN-B');
  assert.strictEqual(result.totalDistanceUnits, 70.0);
  assert.strictEqual(result.returnLegDistUnits, 5.0);
});

test('4. Empty routes and routes containing only one priority group work', () => {
  // 4a. Completely empty candidate list
  const emptyResult = optimizeRoute([], mockThresholds);
  assert.strictEqual(emptyResult.waypoints.length, 0);
  assert.strictEqual(emptyResult.totalDistanceUnits, 0);

  // 4b. All bins below threshold (< 60%)
  const safeBins: Bin[] = [
    { id: 'BIN-S1', fillLevel: 25, location: 'Safe 1', lastUpdated: freshTimestamp(), lat: 20, lng: 20, nodeType: 'simulated' },
    { id: 'BIN-S2', fillLevel: 55, location: 'Safe 2', lastUpdated: freshTimestamp(), lat: 40, lng: 40, nodeType: 'simulated' },
  ];
  const safeResult = optimizeRoute(safeBins, mockThresholds);
  assert.strictEqual(safeResult.waypoints.length, 0);
  assert.strictEqual(safeResult.excludedBins.length, 0); // Not excluded due to error, just nominal

  // 4c. Only critical bins (>= 90%)
  const criticalOnly: Bin[] = [
    { id: 'BIN-C1', fillLevel: 95, location: 'Crit 1', lastUpdated: freshTimestamp(), lat: 30, lng: 30, nodeType: 'simulated' },
    { id: 'BIN-C2', fillLevel: 91, location: 'Crit 2', lastUpdated: freshTimestamp(), lat: 60, lng: 60, nodeType: 'simulated' },
  ];
  const critResult = optimizeRoute(criticalOnly, mockThresholds);
  assert.strictEqual(critResult.waypoints.length, 2);
  assert.strictEqual(critResult.criticalCount, 2);

  // 4d. Only non-critical eligible bins (60% to 89%)
  const routineOnly: Bin[] = [
    { id: 'BIN-R1', fillLevel: 65, location: 'Routine 1', lastUpdated: freshTimestamp(), lat: 30, lng: 30, nodeType: 'simulated' },
    { id: 'BIN-R2', fillLevel: 85, location: 'Routine 2', lastUpdated: freshTimestamp(), lat: 60, lng: 60, nodeType: 'simulated' },
  ];
  const routineResult = optimizeRoute(routineOnly, mockThresholds);
  assert.strictEqual(routineResult.waypoints.length, 2);
  assert.strictEqual(routineResult.criticalCount, 0);
});

test('5. Stale/offline bins are excluded from automatic dispatch and visibly reported', () => {
  const bins: Bin[] = [
    { id: 'BIN-FRESH', fillLevel: 95, location: 'Fresh Active', lastUpdated: freshTimestamp(), lat: 20, lng: 20, nodeType: 'simulated' },
    { id: 'BIN-STALE', fillLevel: 95, location: 'Stale Sensor', lastUpdated: staleTimestamp(), lat: 40, lng: 40, nodeType: 'simulated' },
    { id: 'BIN-OFFLINE', fillLevel: 80, location: 'Offline Node', lastUpdated: 'offline', lat: 60, lng: 60, nodeType: 'simulated' },
    { id: 'BIN-EMPTY-TIME', fillLevel: 85, location: 'No Ping', lastUpdated: '', lat: 70, lng: 70, nodeType: 'simulated' },
  ];

  const result = optimizeRoute(bins, mockThresholds);

  // Only the fresh bin should be in the active dispatch route
  assert.strictEqual(result.waypoints.length, 1);
  assert.strictEqual(result.waypoints[0].bin.id, 'BIN-FRESH');

  // The 3 stale/offline bins must be collected in excludedBins
  assert.strictEqual(result.excludedBins.length, 3);
  const excludedIds = result.excludedBins.map(e => e.bin.id);
  assert.ok(excludedIds.includes('BIN-STALE'));
  assert.ok(excludedIds.includes('BIN-OFFLINE'));
  assert.ok(excludedIds.includes('BIN-EMPTY-TIME'));

  for (const excluded of result.excludedBins) {
    assert.strictEqual(excluded.category, 'stale_telemetry');
    assert.ok(excluded.reason.length > 5);
  }
});

test('6. Missing, non-finite, and invalid coordinates are rejected rather than replaced with defaults', () => {
  const bins: Bin[] = [
    { id: 'BIN-VALID', fillLevel: 85, location: 'Valid', lastUpdated: freshTimestamp(), lat: 50, lng: 50, nodeType: 'simulated' },
    { id: 'BIN-NO-LAT', fillLevel: 85, location: 'Missing Lat', lastUpdated: freshTimestamp(), lng: 50, nodeType: 'simulated' },
    { id: 'BIN-NAN-LNG', fillLevel: 85, location: 'NaN Lng', lastUpdated: freshTimestamp(), lat: 50, lng: NaN, nodeType: 'simulated' },
    { id: 'BIN-OOR-HIGH', fillLevel: 85, location: 'Out of Range', lastUpdated: freshTimestamp(), lat: 150, lng: 50, nodeType: 'simulated' },
    { id: 'BIN-OOR-NEG', fillLevel: 85, location: 'Negative', lastUpdated: freshTimestamp(), lat: -10, lng: 50, nodeType: 'simulated' },
  ];

  const result = optimizeRoute(bins, mockThresholds);

  // Only BIN-VALID is routed
  assert.strictEqual(result.waypoints.length, 1);
  assert.strictEqual(result.waypoints[0].bin.id, 'BIN-VALID');

  // 4 bins rejected due to coordinates
  assert.strictEqual(result.excludedBins.length, 4);
  for (const excluded of result.excludedBins) {
    assert.strictEqual(excluded.category, 'invalid_coordinates');
    assert.ok(!excluded.reason.includes('50, 50'), 'Must not silently claim default 50');
  }
});

test('7. Invalid fill levels are rejected safely', () => {
  const bins: Bin[] = [
    { id: 'BIN-VALID', fillLevel: 80, location: 'Valid', lastUpdated: freshTimestamp(), lat: 30, lng: 30, nodeType: 'simulated' },
    { id: 'BIN-NAN-FILL', fillLevel: NaN, location: 'NaN Fill', lastUpdated: freshTimestamp(), lat: 40, lng: 40, nodeType: 'simulated' },
    { id: 'BIN-NEG-FILL', fillLevel: -20, location: 'Negative Fill', lastUpdated: freshTimestamp(), lat: 50, lng: 50, nodeType: 'simulated' },
    { id: 'BIN-OVER-FILL', fillLevel: 150, location: 'Over 100 Fill', lastUpdated: freshTimestamp(), lat: 60, lng: 60, nodeType: 'simulated' },
  ];

  const result = optimizeRoute(bins, mockThresholds);

  assert.strictEqual(result.waypoints.length, 1);
  assert.strictEqual(result.waypoints[0].bin.id, 'BIN-VALID');

  assert.strictEqual(result.excludedBins.length, 3);
  for (const excluded of result.excludedBins) {
    assert.strictEqual(excluded.category, 'invalid_fill');
  }
});

test('8. No more than six eligible bins use exact optimization', () => {
  // 6 bins -> exact optimization
  const sixBins: Bin[] = Array.from({ length: 6 }, (_, i) => ({
    id: `BIN-0${i + 1}`,
    fillLevel: 80 + i,
    location: `Loc ${i + 1}`,
    lastUpdated: freshTimestamp(),
    lat: 10 + i * 15,
    lng: 10 + i * 15,
    nodeType: 'simulated' as const,
  }));

  const res6 = optimizeRoute(sixBins, mockThresholds);
  assert.strictEqual(res6.waypoints.length, 6);
  assert.strictEqual(res6.isExactOptimization, true);
  assert.ok(res6.statusMessage.includes('Exact optimal route'));

  // 7 bins -> heuristic fallback with clear notice
  const sevenBins: Bin[] = Array.from({ length: 7 }, (_, i) => ({
    id: `BIN-0${i + 1}`,
    fillLevel: 75 + i,
    location: `Loc ${i + 1}`,
    lastUpdated: freshTimestamp(),
    lat: 10 + i * 12,
    lng: 10 + i * 12,
    nodeType: 'simulated' as const,
  }));

  const res7 = optimizeRoute(sevenBins, mockThresholds);
  assert.strictEqual(res7.waypoints.length, 7);
  assert.strictEqual(res7.isExactOptimization, false);
  assert.ok(res7.statusMessage.includes('Heuristic route'));

  // Critical bins must still precede non-critical bins in the fallback!
  let seenNonCritical = false;
  for (const wp of res7.waypoints) {
    if (wp.isCritical) {
      assert.strictEqual(seenNonCritical, false, 'Critical bins must never follow a non-critical bin');
    } else {
      seenNonCritical = true;
    }
  }
});

test('9. The route planner handles null, empty data, and corrupt inputs without crashing', () => {
  // Null input
  const nullResult = optimizeRoute(null as any, mockThresholds);
  assert.strictEqual(nullResult.waypoints.length, 0);
  assert.strictEqual(nullResult.totalDistanceUnits, 0);

  // Undefined input
  const undefResult = optimizeRoute(undefined as any, mockThresholds);
  assert.strictEqual(undefResult.waypoints.length, 0);

  // Empty array
  const emptyResult = optimizeRoute([], mockThresholds);
  assert.strictEqual(emptyResult.waypoints.length, 0);

  // Corrupt objects in array
  const corruptResult = optimizeRoute([{} as any, { id: 'B1' } as any], mockThresholds);
  assert.strictEqual(corruptResult.waypoints.length, 0);
  assert.strictEqual(corruptResult.excludedBins.length, 2);
});
