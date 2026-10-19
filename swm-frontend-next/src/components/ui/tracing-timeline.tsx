import React from 'react';
import { Building2, Flag, Navigation, ArrowUpRight } from 'lucide-react';
import type { Bin, ThresholdConfig } from '../../types';
import type { OptimizedRouteResult } from '../../lib/routePlanner';
import { getBinStatus } from '../../lib/status';
import { ThresholdGauge } from './threshold-gauge';
import { cn } from '../../lib/utils';

interface TracingTimelineProps {
  routeResult: OptimizedRouteResult;
  thresholds: ThresholdConfig;
  onSelectBin: (bin: Bin) => void;
  className?: string;
}

export const TracingTimeline: React.FC<TracingTimelineProps> = ({
  routeResult,
  thresholds,
  onSelectBin,
  className,
}) => {
  return (
    <div className={cn('relative space-y-0 pl-1 sm:pl-3', className)}>
      {/* Background Vertical Connector Spine */}
      <div className="absolute left-[19px] sm:left-[27px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-[#245C43] dark:from-[#86B99A] via-[#8F6B2A] dark:via-[#D4AF67] to-[#202923] dark:to-[#F5F5F5] opacity-30" />

      {/* Origin Node: Central Fleet Depot */}
      <div className="relative flex items-start gap-2.5 sm:gap-4 pb-6 group">
        <div className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#245C43] dark:bg-[#86B99A] text-white dark:text-[#000000] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(36,92,67,0.3)] ring-4 ring-white dark:ring-[#080808]">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="flex-1 pt-1 pb-2 border-b border-[#F0F2ED] dark:border-[#202020] min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
              Central Fleet Depot
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono tabular-nums font-semibold bg-[#E7EFE8] dark:bg-[#0E1A13] text-[#245C43] dark:text-[#86B99A] border border-[#CBDDCF] dark:border-[#172D20]">
              ORIGIN &bull; 0.0 units
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#5F6962] dark:text-[#858585] mt-0.5 leading-relaxed">
            Collection vehicle departure &bull; Dispatch initialization (Synthetic reference location)
          </p>
        </div>
      </div>

      {/* Waypoints Sequence */}
      {routeResult.waypoints.map((step, idx) => {
        const status = getBinStatus(step.bin.fillLevel, thresholds);
        const binNum = step.bin.id.replace('BIN-', '');
        const isCritical = step.isCritical;
        const prevWasCritical = idx > 0 && routeResult.waypoints[idx - 1].isCritical;
        const isPhaseTransition = !isCritical && prevWasCritical;

        return (
          <React.Fragment key={step.bin.id}>
            {/* Visual separator when transitioning from Critical Phase to Routine Phase */}
            {isPhaseTransition && (
              <div className="relative flex items-center gap-2 py-2.5 my-1 pl-10 sm:pl-12 text-[10px] sm:text-[11px] font-semibold text-[#5F6962] dark:text-[#858585]">
                <div className="h-px flex-1 bg-gradient-to-r from-[#9E3E37]/30 via-[#CBDDCF] dark:via-[#202020] to-transparent" />
                <span className="px-2 py-0.5 rounded bg-[#F0F2ED] dark:bg-[#0A0A0A] border border-[#E3E8E1] dark:border-[#202020] uppercase tracking-wider text-[10px] text-[#202923] dark:text-[#F5F5F5] text-center">
                  Transition &bull; Routine Pickup Phase (&ge;{thresholds.medium}%)
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-[#CBDDCF] dark:from-[#202020] to-transparent" />
              </div>
            )}

            <div
              onClick={() => onSelectBin(step.bin)}
              className="relative flex items-start gap-2.5 sm:gap-4 pb-6 group cursor-pointer"
            >
              {/* Numbered Waypoint Badge */}
              <div
                className={cn(
                  'relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full text-white flex items-center justify-center font-bold font-mono tabular-nums text-xs shrink-0 shadow-xs ring-4 ring-white dark:ring-[#080808] transition-transform group-hover:scale-105',
                  status.dotClass
                )}
              >
                {idx + 1}
              </div>

              {/* Waypoint Content Card */}
              <div className="flex-1 p-3 rounded-lg border border-[#E3E8E1] dark:border-[#202020] bg-white dark:bg-[#080808] group-hover:border-[#CDD3C7] dark:group-hover:border-[#282828] group-hover:shadow-[0_2px_4px_rgba(0,0,0,0.03)] dark:group-hover:shadow-none transition-all min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
                        Bin {binNum}
                      </span>
                      <span className="text-[11px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums">
                        ({step.bin.id})
                      </span>
                      <span className="text-xs text-[#5F6962] dark:text-[#B3B3B3] truncate">&bull; {step.bin.location}</span>
                      <span
                        className={cn(
                          'px-2 py-0.2 rounded-full text-[10px] font-semibold border shrink-0',
                          status.badgeClass
                        )}
                      >
                        Priority {status.priority}
                      </span>
                      {isCritical && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FAECEB] dark:bg-[#1F0D0D] text-[#9E3E37] dark:text-[#D9736C] border border-[#ECCDCB] dark:border-[#331616] shrink-0">
                          CRITICAL DISPATCH
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Metrics & Inspection */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[#F0F2ED] dark:border-[#202020]">
                    <div className="flex-1 sm:flex-initial w-auto sm:w-32 min-w-[90px]">
                      <ThresholdGauge
                        fillLevel={step.bin.fillLevel}
                        thresholds={thresholds}
                        showTicks={false}
                      />
                    </div>
                    <span className="text-[#245C43] dark:text-[#86B99A] group-hover:text-[#1D4B36] dark:group-hover:text-[#9BC7AD] text-xs font-semibold flex items-center gap-0.5 shrink-0 min-h-[32px] sm:min-h-0 items-center">
                      Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Transit Details */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-[#848F87] dark:text-[#858585] mt-2 pt-2 border-t border-[#F0F2ED] dark:border-[#202020] font-mono tabular-nums">
                  <span className="text-[#5F6962] dark:text-[#B3B3B3]">
                    <Navigation className="w-3 h-3 inline mr-1 text-[#848F87] dark:text-[#858585]" />
                    Segment: +{step.segmentDist.toFixed(1)} units
                  </span>
                  <span>Cumulative: {step.cumulativeDist.toFixed(1)} units</span>
                  <span>Fill: {step.bin.fillLevel}%</span>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* Destination Node: Central Waste Facility */}
      <div className="relative flex items-start gap-3 sm:gap-4 group">
        <div className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#202923] dark:bg-[#0A0A0A] text-white dark:text-[#F5F5F5] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.3)] ring-4 ring-white dark:ring-[#080808] border border-transparent dark:border-[#202020]">
          <Flag className="w-4 h-4" />
        </div>
        <div className="flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
              Central Waste Facility (Synthetic Reference)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono tabular-nums font-semibold bg-[#F0F2ED] dark:bg-[#0A0A0A] text-[#202923] dark:text-[#F5F5F5] border border-[#E3E8E1] dark:border-[#202020]">
              DESTINATION &bull; Return Leg: +{routeResult.returnLegDistUnits.toFixed(1)} units
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#5F6962] dark:text-[#858585] mt-0.5 leading-relaxed">
            Fleet unloading &amp; compaction complete &bull; Total Tour: {routeResult.totalDistanceUnits.toFixed(1)} campus distance units
          </p>
        </div>
      </div>
    </div>
  );
};
