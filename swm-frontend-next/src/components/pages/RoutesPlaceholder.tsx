import React, { useState } from 'react';
import { Route, Send, Check, AlertTriangle, ArrowUpRight } from 'lucide-react';
import type { Bin, ThresholdConfig } from '../../types';
import { optimizeRoute } from '../../lib/routePlanner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { NumberTicker } from '../ui/number-ticker';
import { TracingTimeline } from '../ui/tracing-timeline';
import { ShimmerButton } from '../ui/shimmer-button';

interface RoutesPlaceholderProps {
  bins: Bin[];
  thresholds: ThresholdConfig;
  onSelectBin: (bin: Bin) => void;
}

export const RoutesPlaceholder: React.FC<RoutesPlaceholderProps> = ({
  bins,
  thresholds,
  onSelectBin,
}) => {
  const [isDispatched, setIsDispatched] = useState(false);

  // Evaluate and optimize route using exact critical-first constraint
  const routeResult = optimizeRoute(bins, thresholds);

  const handleDispatch = () => {
    setIsDispatched(true);
    setTimeout(() => setIsDispatched(false), 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Route Header Banner */}
      <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-[#080808] border border-[#E3E8E1] dark:border-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-[#E7EFE8] dark:bg-[#0E1A13] text-[#245C43] dark:text-[#86B99A] flex items-center gap-1 border border-[#CBDDCF] dark:border-[#172D20]">
            <Route className="w-3 h-3" /> Dynamic Dispatch
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-[#F0F2ED] dark:bg-[#0A0A0A] text-[#5F6962] dark:text-[#858585] border border-[#E3E8E1] dark:border-[#202020]">
            Critical-First Constrained
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono text-[#848F87] dark:text-[#858585] bg-[#F7F8F5] dark:bg-[#080808] border border-[#E3E8E1] dark:border-[#202020]">
            Campus Facility Grid (0–100)
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
              Collection Route Optimization
            </h2>
            <p className="text-xs text-[#5F6962] dark:text-[#858585] max-w-2xl mt-1 leading-relaxed">
              Optimal collection tour departing from Central Fleet Depot, visiting all critical bins (&ge;{thresholds.critical}%) first, followed by remaining eligible bins (&ge;{thresholds.medium}%), and concluding at the Central Waste Facility. All distances in Euclidean campus distance units.
            </p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <ShimmerButton
              size="sm"
              onClick={handleDispatch}
              disabled={routeResult.waypoints.length === 0}
              className="w-full sm:w-auto min-h-[40px] sm:min-h-0"
            >
              {isDispatched ? <Check className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
              <span>{isDispatched ? 'Dispatched' : 'Dispatch Collection Run'}</span>
            </ShimmerButton>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar with NumberTicker */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 bg-white dark:bg-[#080808] rounded-lg border border-[#E3E8E1] dark:border-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#5F6962] dark:text-[#858585] uppercase tracking-wider block truncate">
            Serviced Stops
          </span>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#202923] dark:text-[#F5F5F5] font-mono tracking-tight tabular-nums mt-0.5">
            {bins.length === 0 ? '—' : <NumberTicker value={routeResult.waypoints.length} />}
          </div>
          <span className="text-[10px] text-[#848F87] dark:text-[#858585] block mt-0.5 truncate">
            Bins requiring pickup
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-[#080808] rounded-lg border border-[#E3E8E1] dark:border-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#5F6962] dark:text-[#858585] uppercase tracking-wider block truncate">
            Critical Stops
          </span>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#9E3E37] dark:text-[#D9736C] font-mono tracking-tight tabular-nums mt-0.5">
            {bins.length === 0 ? '—' : <NumberTicker value={routeResult.criticalCount} />}
          </div>
          <span className="text-[10px] text-[#848F87] dark:text-[#858585] block mt-0.5 truncate">
            &ge;{thresholds.critical}% fill (first priority)
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-[#080808] rounded-lg border border-[#E3E8E1] dark:border-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#5F6962] dark:text-[#858585] uppercase tracking-wider block truncate">
            Est. Tour Time
          </span>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#202923] dark:text-[#F5F5F5] font-mono tracking-tight tabular-nums mt-0.5">
            {routeResult.waypoints.length > 0 ? `~${routeResult.estimatedMinutes} min` : 'Standby'}
          </div>
          <span className="text-[10px] text-[#848F87] dark:text-[#858585] block mt-0.5 truncate">
            Servicing + transit estimate
          </span>
        </div>
        <div className="p-3 bg-white dark:bg-[#080808] rounded-lg border border-[#E3E8E1] dark:border-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.03)] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#5F6962] dark:text-[#858585] uppercase tracking-wider block truncate">
            Tour Distance
          </span>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#202923] dark:text-[#F5F5F5] font-mono tracking-tight tabular-nums mt-0.5">
            {routeResult.waypoints.length > 0 ? `${routeResult.totalDistanceUnits.toFixed(1)} units` : '0.0 units'}
          </div>
          <span className="text-[10px] text-[#848F87] dark:text-[#858585] block mt-0.5 truncate">
            Campus distance units (Euclidean)
          </span>
        </div>
      </div>

      {/* Sequenced Waypoint Sequence with TracingTimeline */}
      <Card className="border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <CardHeader className="border-b border-[#E3E8E1] dark:border-[#202020] p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
                Planned Waypoint Sequence
              </CardTitle>
              <CardDescription className="text-xs text-[#5F6962] dark:text-[#858585] mt-0.5 leading-relaxed">
                Central Depot &rarr; Critical Bins &rarr; Remaining Due Bins &rarr; Waste Facility
              </CardDescription>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E7EFE8] dark:bg-[#0E1A13] text-[#245C43] dark:text-[#86B99A] border border-[#CBDDCF] dark:border-[#172D20]">
              {routeResult.isExactOptimization ? 'Exact Optimal Tour' : 'Heuristic Tour'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {bins.length === 0 ? (
            <div className="py-8 px-4 bg-[#F7F8F5] dark:bg-[#080808] dark:bg-dot-grid-subtle rounded-md text-center text-xs text-[#5F6962] dark:text-[#858585]">
              Awaiting bin data to evaluate collection route stops.
            </div>
          ) : routeResult.waypoints.length === 0 ? (
            <div className="py-6 px-4 bg-[#E7EFE8] dark:bg-[#0E1A13] text-[#245C43] dark:text-[#86B99A] rounded-md text-center text-xs border border-[#CBDDCF] dark:border-[#172D20]">
              <strong>All Monitored Bins Within Safe Limits:</strong> All valid bins are currently below collection threshold (&lt;{thresholds.medium}%). Collection vehicle remains on standby at Central Depot.
            </div>
          ) : (
            <TracingTimeline
              routeResult={routeResult}
              thresholds={thresholds}
              onSelectBin={onSelectBin}
            />
          )}
        </CardContent>
      </Card>

      {/* Excluded Bins / Needs Verification Card */}
      {routeResult.excludedBins && routeResult.excludedBins.length > 0 && (
        <Card className="border-[#EEDCC0] dark:border-[#2E230E] bg-white dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <CardHeader className="border-b border-[#EEDCC0] dark:border-[#2E230E] p-4 sm:p-5 pb-3 bg-[#FCFBF8] dark:bg-[#0D0B07]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold tracking-tight text-[#8F6B2A] dark:text-[#D4AF67] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Needs Verification &bull; Excluded from Automated Dispatch
                </CardTitle>
                <CardDescription className="text-xs text-[#5F6962] dark:text-[#858585] mt-0.5 leading-relaxed">
                  Nodes excluded from collection routing due to stale telemetry, missing coordinates, or invalid sensor readings
                </CardDescription>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FAF3E7] dark:bg-[#1C1508] text-[#8F6B2A] dark:text-[#D4AF67] border border-[#EEDCC0] dark:border-[#2E230E]">
                {routeResult.excludedBins.length} Excluded
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-[#E3E8E1] dark:divide-[#202020]">
            {routeResult.excludedBins.map(({ bin, reason, category }) => {
              const binNum = bin.id.replace('BIN-', '');
              return (
                <div
                  key={bin.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#8F6B2A] dark:bg-[#D4AF67] text-white dark:text-[#000000] font-bold text-xs flex items-center justify-center font-mono tabular-nums shrink-0">
                      {binNum}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-xs sm:text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
                          Bin {binNum}
                        </span>
                        <span className="text-[11px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums">
                          ({bin.id})
                        </span>
                        <span className="text-xs text-[#5F6962] dark:text-[#B3B3B3]">
                          &bull; {bin.location}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#FAF3E7] dark:bg-[#1C1508] text-[#8F6B2A] dark:text-[#D4AF67] border border-[#EEDCC0] dark:border-[#2E230E]">
                          {category === 'stale_telemetry' ? 'Stale / Offline' : category === 'invalid_coordinates' ? 'Invalid Coords' : 'Invalid Fill'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9E3E37] dark:text-[#D9736C] mt-0.5 font-medium flex items-center gap-1">
                        &bull; {reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 sm:h-7 min-h-[36px] sm:min-h-0 text-xs font-semibold text-[#8F6B2A] dark:text-[#D4AF67] hover:bg-[#FAF3E7] dark:hover:bg-[#1C1508] gap-1 px-2.5 cursor-pointer w-full sm:w-auto justify-center"
                      onClick={() => onSelectBin(bin)}
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

