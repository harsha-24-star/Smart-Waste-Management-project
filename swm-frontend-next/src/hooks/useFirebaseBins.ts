import { useState, useEffect, useCallback, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../lib/firebase';
import type { Bin, FirebaseConnectionStatus, ESP32StreamStatus } from '../types';
import { isHardwareBin } from '../types';
import { getBinFreshness } from '../lib/telemetry';

// Explicit demo dataset retained ONLY for offline visualization if requested by user
export const DEMO_BINS: Bin[] = [
  { id: 'BIN-01', fillLevel: 78, location: 'Main Block', lastUpdated: '12 seconds ago', sensorId: 'ESP32-001', lat: 25, lng: 20, nodeType: 'hardware' },
  { id: 'BIN-02', fillLevel: 92, location: 'Canteen', lastUpdated: '1 minute ago', sensorId: 'ESP32-002', lat: 35, lng: 55, nodeType: 'simulated' },
  { id: 'BIN-03', fillLevel: 60, location: 'Library', lastUpdated: '3 minutes ago', sensorId: 'ESP32-003', lat: 55, lng: 30, nodeType: 'simulated' },
  { id: 'BIN-04', fillLevel: 35, location: 'Hostel A', lastUpdated: '5 minutes ago', sensorId: 'ESP32-004', lat: 70, lng: 15, nodeType: 'simulated' },
  { id: 'BIN-05', fillLevel: 84, location: 'Parking Area', lastUpdated: '1 minute ago', sensorId: 'ESP32-005', lat: 30, lng: 80, nodeType: 'simulated' },
  { id: 'BIN-06', fillLevel: 95, location: 'Hostel B', lastUpdated: '30 seconds ago', sensorId: 'ESP32-006', lat: 75, lng: 75, nodeType: 'simulated' },
];

export interface UseFirebaseBinsReturn {
  bins: Bin[];
  connectionStatus: FirebaseConnectionStatus;
  error: Error | null;
  lastSyncTime: Date | null;
  esp32Status: ESP32StreamStatus;
  esp32AgeMs: number | null;
  esp32LastPing: string | null;
  hardwareCount: number;
  simulatedCount: number;
  hardwareBin: Bin | null;
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  refresh: () => void;
}

export function useFirebaseBins(): UseFirebaseBinsReturn {
  const [liveBins, setLiveBins] = useState<Bin[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<FirebaseConnectionStatus>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // ESP32 Hardware Status (Specifically BIN-01 node)
  const [esp32Status, setEsp32Status] = useState<ESP32StreamStatus>('unknown');
  const [esp32AgeMs, setEsp32AgeMs] = useState<number | null>(null);
  const [esp32LastPing, setEsp32LastPing] = useState<string | null>(null);

  // Periodic ESP32 Heartbeat Monitor (evaluates age of BIN-01 telemetry)
  const evaluateESP32Freshness = useCallback((binList: Bin[]) => {
    const bin01 = binList.find((b) => b.id === 'BIN-01');
    if (!bin01 || !bin01.lastUpdated) {
      setEsp32Status('offline');
      setEsp32AgeMs(null);
      setEsp32LastPing(null);
      return;
    }

    setEsp32LastPing(bin01.lastUpdated);
    const freshness = getBinFreshness('BIN-01', bin01.lastUpdated);
    setEsp32Status(freshness.status);
    setEsp32AgeMs(freshness.ageMs);
  }, []);

  // Subscribe to Firebase RTDB
  useEffect(() => {
    setConnectionStatus('connecting');
    setError(null);

    // 1. Connection presence listener (.info/connected)
    const connectedRef = ref(database, '.info/connected');
    const unsubscribeConnected = onValue(
      connectedRef,
      (snapshot) => {
        const isConnected = Boolean(snapshot.val());
        if (!isConnected) {
          setConnectionStatus((prev) => (prev === 'connected' ? 'disconnected' : prev));
        }
      },
      (err) => {
        console.warn('Firebase .info/connected listener error:', err);
      }
    );

    // 2. Primary /bins listener
    const binsRef = ref(database, 'bins');
    const unsubscribeBins = onValue(
      binsRef,
      (snapshot) => {
        const data = snapshot.val();
        setLastSyncTime(new Date());
        setConnectionStatus('connected');
        setError(null);

        if (data && typeof data === 'object') {
          // Deserialization matching existing schema with explicit frontend nodeType
          const mappedBins: Bin[] = Object.keys(data).map((key) => {
            const raw = data[key];
            const binId = String(raw.id || key);
            return {
              id: binId,
              fillLevel: typeof raw.fillLevel === 'number' ? raw.fillLevel : (parseFloat(raw.fillLevel) || 0),
              location: String(raw.location || 'Campus Facility'),
              lastUpdated: String(raw.lastUpdated || ''),
              sensorId: raw.sensorId ? String(raw.sensorId) : undefined,
              lat: typeof raw.lat === 'number' ? raw.lat : (typeof raw.y === 'number' ? raw.y : undefined),
              lng: typeof raw.lng === 'number' ? raw.lng : (typeof raw.x === 'number' ? raw.x : undefined),
              nodeType: isHardwareBin(binId) ? 'hardware' : 'simulated',
            };
          });

          setLiveBins(mappedBins);
          evaluateESP32Freshness(mappedBins);
        } else {
          // Honest empty state when /bins has no records
          setLiveBins([]);
          setEsp32Status('offline');
          setEsp32AgeMs(null);
          setEsp32LastPing(null);
        }
      },
      (err) => {
        console.error('Firebase /bins listener error:', err);
        setConnectionStatus('error');
        setError(err);
      }
    );

    // 3. Heartbeat interval (checks staleness every 2s, matching legacy script.js)
    const intervalId = setInterval(() => {
      setLiveBins((current) => {
        evaluateESP32Freshness(current);
        return current;
      });
    }, 2000);

    // Cleanup on unmount
    return () => {
      unsubscribeConnected();
      unsubscribeBins();
      clearInterval(intervalId);
    };
  }, [evaluateESP32Freshness]);

  const activeBins = isDemoMode ? DEMO_BINS : liveBins;

  const hardwareCount = useMemo(() => {
    return activeBins.filter((b) => b.nodeType === 'hardware').length;
  }, [activeBins]);

  const simulatedCount = useMemo(() => {
    return activeBins.filter((b) => b.nodeType === 'simulated').length;
  }, [activeBins]);

  const hardwareBin = useMemo(() => {
    return activeBins.find((b) => b.nodeType === 'hardware') || null;
  }, [activeBins]);

  const refresh = useCallback(() => {
    evaluateESP32Freshness(isDemoMode ? DEMO_BINS : liveBins);
  }, [evaluateESP32Freshness, isDemoMode, liveBins]);

  return {
    bins: activeBins,
    connectionStatus,
    error,
    lastSyncTime,
    esp32Status: isDemoMode ? 'online' : esp32Status,
    esp32AgeMs: isDemoMode ? 12000 : esp32AgeMs,
    esp32LastPing: isDemoMode ? '12s ago (Demo)' : esp32LastPing,
    hardwareCount,
    simulatedCount,
    hardwareBin,
    isDemoMode,
    setDemoMode: setIsDemoMode,
    refresh,
  };
}
