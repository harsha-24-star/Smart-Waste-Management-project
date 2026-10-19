/**
 * Core domain types for Smart Waste Management platform
 * Matches ESP32 sensor payload and Firebase Realtime Database /bins node
 */

export type BinNodeType = 'hardware' | 'simulated';

export interface Bin {
  id: string;              // e.g. "BIN-01"
  fillLevel: number;       // 0 to 100 percentage
  location: string;        // e.g. "Main Block", "Canteen"
  lastUpdated: string;     // Raw string from database (ISO or relative)
  sensorId?: string;       // e.g. "ESP32-001"
  lat?: number;            // Campus grid coordinate (0-100 scale, NOT geo lat)
  lng?: number;            // Campus grid coordinate (0-100 scale, NOT geo lng)
  nodeType: BinNodeType;   // Explicit distinction: 'hardware' for physical BIN-01, 'simulated' for BIN-02..06
}

export function isHardwareBin(binId: string): boolean {
  return binId === 'BIN-01';
}

export type StatusTier = 'normal' | 'medium' | 'warning' | 'critical';

export interface BinStatus {
  tier: StatusTier;
  label: string;
  badgeClass: string;
  dotClass: string;
  priority: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  risk: 'Nominal' | 'Moderate' | 'Elevated' | 'High';
}

export interface ThresholdConfig {
  normal: number;    // Default 40
  medium: number;    // Default 60
  warning: number;   // Default 80
  critical: number;  // Default 90
}

export type ThemeMode = 'light' | 'dark';

export type NavigationPage = 'dashboard' | 'bins' | 'routes' | 'analytics' | 'settings';

export interface PageMeta {
  title: string;
  subtitle: string;
}

export type FirebaseConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type ESP32StreamStatus = 'online' | 'stale' | 'offline' | 'unknown';

export interface TelemetryFreshness {
  isHardwareNode: boolean; // true for BIN-01
  status: ESP32StreamStatus;
  ageMs: number | null;
  displayText: string;
  isStale: boolean;
}
