import React from 'react';
import { 
  X, 
  MapPin, 
  BarChart2, 
  ShieldAlert, 
  Clock, 
  Flag, 
  Cpu,
  Compass,
  Route
} from 'lucide-react';
import type { Bin, ThresholdConfig } from '../../types';
import { getBinStatus } from '../../lib/status';
import { getBinFreshness } from '../../lib/telemetry';
import { Button } from '../ui/button';
import { ShimmerButton } from '../ui/shimmer-button';
import { ThresholdGauge } from '../ui/threshold-gauge';

interface BinDetailModalProps {
  bin: Bin | null;
  onClose: () => void;
  thresholds: ThresholdConfig;
  onNavigateToRoute?: () => void;
}

export const BinDetailModal: React.FC<BinDetailModalProps> = ({
  bin,
  onClose,
  thresholds,
  onNavigateToRoute,
}) => {
  // Close on Escape key
  React.useEffect(() => {
    if (!bin) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bin, onClose]);

  if (!bin) return null;

  const status = getBinStatus(bin.fillLevel, thresholds);
  const freshness = getBinFreshness(bin.id, bin.lastUpdated);
  const binNum = bin.id.replace('BIN-', '');
  const fill = Number(bin.fillLevel) || 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm dark:bg-dot-grid"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Bin ${binNum} Telemetry Inspector`}
    >
      <div 
        className="relative w-full max-w-md max-h-[90dvh] flex flex-col bg-white dark:bg-[#080808] rounded-lg border border-[#E3E8E1] dark:border-[#202020] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E3E8E1] dark:border-[#202020] flex items-center justify-between bg-[#F7F8F5] dark:bg-[#000000] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md text-white flex items-center justify-center text-xs font-bold font-mono tabular-nums shrink-0 shadow-xs ${status.dotClass}`}>
              {binNum}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[#5F6962] dark:text-[#858585] uppercase tracking-wider block">
                Bin Telemetry Inspector
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5] truncate">
                  Bin {binNum} <span className="text-xs text-[#848F87] dark:text-[#858585] font-mono tabular-nums">({bin.id})</span>
                </h3>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 text-[#5F6962] dark:text-[#858585] hover:text-[#202923] dark:hover:text-[#F5F5F5] rounded-md transition-colors cursor-pointer"
            aria-label="Close dialog"
            title="Close dialog"
          >
            <div className="h-7 w-7 rounded border border-[#E3E8E1] dark:border-[#202020] flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Body (Scrollable if height exceeds screen) */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
          {/* Location */}
          <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-[#F0F2ED] dark:border-[#202020]">
            <span className="flex items-center gap-2 text-[#5F6962] dark:text-[#858585]">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848F87] dark:text-[#858585]" />
              Campus Location
            </span>
            <span className="font-semibold text-[#202923] dark:text-[#F5F5F5]">{bin.location}</span>
          </div>

          {/* Ultrasonic Fill Level with Precision Gauge */}
          <div className="space-y-1.5 py-1 border-b border-[#F0F2ED] dark:border-[#202020] pb-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-2 text-[#5F6962] dark:text-[#858585]">
                <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848F87] dark:text-[#858585]" />
                Ultrasonic Fill Level
              </span>
              <span className="font-bold text-[#202923] dark:text-[#F5F5F5] font-mono tabular-nums">{fill}%</span>
            </div>
            <ThresholdGauge
              fillLevel={fill}
              thresholds={thresholds}
              showValue={false}
            />
            <div className="flex justify-between text-[10px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums px-0.5">
              <span>0%</span>
              <span style={{ left: `${thresholds.warning}%` }}>Warn: {thresholds.warning}%</span>
              <span>Crit: {thresholds.critical}%</span>
            </div>
          </div>

          {/* Status Severity */}
          <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-[#F0F2ED] dark:border-[#202020]">
            <span className="flex items-center gap-2 text-[#5F6962] dark:text-[#858585]">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848F87] dark:text-[#858585]" />
              Status Severity
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${status.badgeClass}`}>
              {status.label}
            </span>
          </div>

          {/* Last Sensor Ping / Freshness */}
          <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-[#F0F2ED] dark:border-[#202020]">
            <span className="flex items-center gap-2 text-[#5F6962] dark:text-[#858585]">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848F87] dark:text-[#858585]" />
              Last Recorded Reading
            </span>
            <div className="text-right">
              <span className="text-xs text-[#202923] dark:text-[#F5F5F5] font-mono tabular-nums block font-medium">
                {freshness.displayText}
              </span>
              {bin.lastUpdated && bin.lastUpdated.includes('T') && (
                <span className="text-[10px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums block">
                  {new Date(bin.lastUpdated).toLocaleDateString()} {new Date(bin.lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Collection Priority */}
          <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-[#F0F2ED] dark:border-[#202020]">
            <span className="flex items-center gap-2 text-[#5F6962] dark:text-[#858585]">
              <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848F87] dark:text-[#858585]" />
              Collection Priority
            </span>
            <span className="font-bold text-xs text-[#202923] dark:text-[#F5F5F5]">Priority {status.priority}</span>
          </div>

          {/* Sensor / Microcontroller ID */}
          <div className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-[#F0F2ED] dark:border-[#202020]">
            <span className="flex items-center gap-2 text-[#5F6962] dark:text-[#858585]">
              <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#848F87] dark:text-[#858585]" />
              Sensor ID
            </span>
            <span className="font-mono tabular-nums text-[11px] sm:text-xs text-[#202923] dark:text-[#F5F5F5] bg-[#F0F2ED] dark:bg-[#0A0A0A] px-2 py-0.5 rounded border border-[#E3E8E1] dark:border-[#202020]">
              {bin.sensorId || 'ESP32'}
            </span>
          </div>

          {/* Campus Grid Coordinates */}
          {(bin.lat !== undefined || bin.lng !== undefined) && (
            <div className="flex items-center justify-between text-xs py-1 text-[#5F6962] dark:text-[#858585]">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#848F87] dark:text-[#858585]" />
                Campus Position
              </span>
              <span className="font-mono tabular-nums text-[#202923] dark:text-[#F5F5F5]">
                ({bin.lng !== undefined ? bin.lng : '—'}, {bin.lat !== undefined ? bin.lat : '—'})
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-[#E3E8E1] dark:border-[#202020] bg-[#F7F8F5] dark:bg-[#000000] flex flex-col xs:flex-row items-stretch xs:items-center justify-end gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 sm:h-8 min-h-[40px] sm:min-h-0 text-xs font-medium text-[#5F6962] dark:text-[#B3B3B3] border-[#E3E8E1] dark:border-[#202020] hover:bg-[#E8ECE5] dark:hover:bg-[#0A0A0A] w-full xs:w-auto justify-center"
          >
            Close
          </Button>
          {onNavigateToRoute && (
            <ShimmerButton
              size="sm"
              onClick={onNavigateToRoute}
              className="w-full xs:w-auto min-h-[40px] sm:min-h-0 justify-center"
            >
              <Route className="w-3.5 h-3.5 mr-1" />
              <span>View in Route</span>
            </ShimmerButton>
          )}
        </div>
      </div>
    </div>
  );
};
