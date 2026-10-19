import type { TelemetryFreshness, ESP32StreamStatus } from '../types';

/**
 * 15-second freshness threshold matching legacy script.js:
 * Evaluated for hardware telemetry age (BIN-01).
 */
export const SENSOR_FRESHNESS_THRESHOLD_MS = 15000;

/**
 * 15-minute freshness threshold for simulated node heartbeats.
 */
export const SIMULATED_FRESHNESS_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Evaluates telemetry timestamp age and freshness.
 * Accurately marks stale readings without technical jargon.
 */
export function getBinFreshness(binId: string, rawTimestamp: string | undefined): TelemetryFreshness {
  const isHardwareNode = binId === 'BIN-01';

  if (!rawTimestamp || rawTimestamp.trim() === '') {
    return {
      isHardwareNode,
      status: isHardwareNode ? 'offline' : 'unknown',
      ageMs: null,
      displayText: 'No reading recorded',
      isStale: true,
    };
  }

  const s = rawTimestamp.trim();
  const sLower = s.toLowerCase();

  // Explicit offline / disconnected indicator
  if (sLower === 'offline' || sLower.includes('disconnected')) {
    return {
      isHardwareNode,
      status: 'offline',
      ageMs: null,
      displayText: 'Offline',
      isStale: true,
    };
  }

  // Handle ISO 8601 timestamps
  const parsed = new Date(s);
  const isValidDate = !isNaN(parsed.getTime());

  if (isValidDate) {
    const ageMs = Date.now() - parsed.getTime();
    const effectiveAgeMs = ageMs < 0 ? 0 : ageMs;
    const thresholdMs = isHardwareNode ? SENSOR_FRESHNESS_THRESHOLD_MS : SIMULATED_FRESHNESS_THRESHOLD_MS;
    const isStale = effectiveAgeMs > thresholdMs;

    const status: ESP32StreamStatus = isStale ? 'stale' : 'online';

    const seconds = Math.floor(effectiveAgeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let displayText = '';
    if (seconds < 15) {
      displayText = 'Just now';
    } else if (seconds < 60) {
      displayText = `${seconds}s ago`;
    } else if (minutes < 60) {
      displayText = `${minutes}m ago`;
    } else if (hours < 24) {
      displayText = `${hours}h ago`;
    } else {
      displayText = `${days}d ago`;
    }

    return {
      isHardwareNode,
      status,
      ageMs: effectiveAgeMs,
      displayText: isHardwareNode ? displayText : parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isStale,
    };
  }

  // Handle pre-formatted relative strings ("12 seconds ago", "1 minute ago", etc.)
  if (sLower === 'live' || sLower === 'just now') {
    return {
      isHardwareNode,
      status: 'online',
      ageMs: 0,
      displayText: 'Live',
      isStale: false,
    };
  }

  // Match seconds
  const secMatch = sLower.match(/^(\d+)\s*(s|sec|seconds?)\s*ago$/);
  if (secMatch) {
    const sec = parseInt(secMatch[1], 10);
    const isStale = isHardwareNode ? sec > 15 : sec > 900;
    return {
      isHardwareNode,
      status: isStale ? 'stale' : 'online',
      ageMs: sec * 1000,
      displayText: s,
      isStale,
    };
  }

  // Match minutes
  const minMatch = sLower.match(/^(\d+)\s*(m|min|minutes?)\s*ago$/);
  if (minMatch) {
    const min = parseInt(minMatch[1], 10);
    const isStale = isHardwareNode ? true : min > 15;
    return {
      isHardwareNode,
      status: isStale ? 'stale' : 'online',
      ageMs: min * 60 * 1000,
      displayText: s,
      isStale,
    };
  }

  // Match hours / days
  if (sLower.match(/^(\d+)\s*(h|hr|hours?|d|days?)\s*ago$/)) {
    return {
      isHardwareNode,
      status: 'stale',
      ageMs: null,
      displayText: s,
      isStale: true,
    };
  }

  // Fallback for unrecognized relative strings
  const fallbackStale = isHardwareNode;
  return {
    isHardwareNode,
    status: fallbackStale ? 'stale' : 'unknown',
    ageMs: null,
    displayText: s,
    isStale: fallbackStale,
  };
}
