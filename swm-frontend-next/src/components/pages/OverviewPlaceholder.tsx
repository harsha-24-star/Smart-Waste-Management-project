import React, { useState } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  ChevronRight,
  Package,
  ArrowUpRight,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import type { Bin, ThresholdConfig, NavigationPage, FirebaseConnectionStatus } from '../../types';
import { getBinStatus } from '../../lib/status';
import { getBinFreshness } from '../../lib/telemetry';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { NumberTicker } from '../ui/number-ticker';
import { BorderBeam } from '../ui/border-beam';
import { SegmentedBar, type Segment } from '../ui/segmented-bar';
import { ThresholdGauge } from '../ui/threshold-gauge';
import { Particles } from '../ui/particles';
import { ShimmerButton } from '../ui/shimmer-button';
import { cn } from '../../lib/utils';

interface OverviewPlaceholderProps {
  bins: Bin[];
  thresholds: ThresholdConfig;
  connectionStatus: FirebaseConnectionStatus;
  onNavigate: (page: NavigationPage) => void;
  onSelectBin: (bin: Bin) => void;
  isDark?: boolean;
}

export const OverviewPlaceholder: React.FC<OverviewPlaceholderProps> = ({
  bins,
  thresholds,
  connectionStatus,
  onNavigate,
  onSelectBin,
  isDark = false,
}) => {
  const [selectedTierFilter, setSelectedTierFilter] = useState<string | null>(null);

  const normalBins = bins.filter(b => getBinStatus(b.fillLevel, thresholds).tier === 'normal');
  const mediumBins = bins.filter(b => getBinStatus(b.fillLevel, thresholds).tier === 'medium');
  const warningBins = bins.filter(b => getBinStatus(b.fillLevel, thresholds).tier === 'warning');
  const criticalBins = bins.filter(b => getBinStatus(b.fillLevel, thresholds).tier === 'critical');

  const normalCount = normalBins.length;
  const mediumCount = mediumBins.length;
  const warningCount = warningBins.length;
  const criticalCount = criticalBins.length;
  const actionCount = warningCount + criticalCount;
  const totalCount = bins.length;

  // Average Fleet Capacity
  const avgCapacity = totalCount > 0
    ? Math.round(bins.reduce((acc, b) => acc + (Number(b.fillLevel) || 0), 0) / totalCount)
    : 0;

  // Segments for the 21st.dev inspired SegmentedBar
  const segments: Segment[] = [
    {
      key: 'normal',
      label: 'Normal',
      count: normalCount,
      color: 'bg-[#245C43] dark:bg-[#86B99A]',
      bgColor: 'bg-[#E7EFE8] dark:bg-[#0E1A13]',
      textColor: 'text-[#245C43] dark:text-[#86B99A]',
      borderColor: 'border-[#CBDDCF] dark:border-[#172D20]',
    },
    {
      key: 'medium',
      label: 'Medium',
      count: mediumCount,
      color: 'bg-[#2F5C78] dark:bg-[#7FA8C4]',
      bgColor: 'bg-[#EAF2F7] dark:bg-[#0E161F]',
      textColor: 'text-[#2F5C78] dark:text-[#7FA8C4]',
      borderColor: 'border-[#C6DDEB] dark:border-[#162635]',
    },
    {
      key: 'warning',
      label: 'Nearly Full',
      count: warningCount,
      color: 'bg-[#8F6B2A] dark:bg-[#D4AF67]',
      bgColor: 'bg-[#FAF3E7] dark:bg-[#1C1508]',
      textColor: 'text-[#8F6B2A] dark:text-[#D4AF67]',
      borderColor: 'border-[#EEDCC0] dark:border-[#2E230E]',
    },
    {
      key: 'critical',
      label: 'Critical',
      count: criticalCount,
      color: 'bg-[#9E3E37] dark:bg-[#D9736C]',
      bgColor: 'bg-[#FAECEB] dark:bg-[#1F0D0D]',
      textColor: 'text-[#9E3E37] dark:text-[#D9736C]',
      borderColor: 'border-[#ECCDCB] dark:border-[#331616]',
    },
  ];

  // Filtered and sorted bins
  const displayBins = bins
    .filter(bin => {
      if (!selectedTierFilter) return true;
      return getBinStatus(bin.fillLevel, thresholds).tier === selectedTierFilter;
    })
    .sort((a, b) => {
      const aFill = Number(a.fillLevel) || 0;
      const bFill = Number(b.fillLevel) || 0;
      const aUrgent = aFill >= thresholds.warning;
      const bUrgent = bFill >= thresholds.warning;
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      return bFill - aFill;
    });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Compact Overview Hero Section with Magic UI Animated Particles */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#17382A] via-[#1E4A37] to-[#245C43] dark:from-[#050505] dark:via-[#080808] dark:to-[#0A0A0A] border border-[#2D664E] dark:border-[#202020] p-4 sm:p-5 shadow-[0_2px_4px_rgba(0,0,0,0.06)] text-white">
        {/* Magic UI Animated Dust Particles Ambient Layer */}
        <Particles
          className="absolute inset-0 z-0 pointer-events-none"
          quantity={45}
          staticity={35}
          ease={50}
          size={0.75}
          color={isDark ? "#A3D1B5" : "#E7EFE8"}
          vx={0.03}
          vy={-0.035}
        />

        {/* Hero Foreground Content Layer */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight drop-shadow-xs">
                Campus Waste Intelligence
              </h2>
              {/* Understated system connection indicator */}
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#133024]/80 dark:bg-[#0A0A0A] text-[#E7EFE8] dark:text-[#F5F5F5] border border-[#3E8063]/60 dark:border-[#202020] backdrop-blur-[2px]">
                <span className="relative flex h-1.5 w-1.5">
                  {connectionStatus === 'connected' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#82D4A4] dark:bg-[#86B99A] opacity-75" />
                  )}
                  <span className={cn(
                    'relative inline-flex rounded-full h-1.5 w-1.5',
                    connectionStatus === 'connected' ? 'bg-[#82D4A4] dark:bg-[#86B99A]' :
                    connectionStatus === 'connecting' ? 'bg-[#E5B568] dark:bg-[#D4AF67]' : 'bg-[#E57A7A] dark:bg-[#D9736C]'
                  )} />
                </span>
                <span className="capitalize">
                  {connectionStatus === 'connected' ? 'Live Stream Active' : connectionStatus}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#D1E2D4] dark:text-[#B3B3B3] mt-1 font-normal leading-relaxed">
              Smarter monitoring. Timely collection. Cleaner campuses.
            </p>
          </div>

          {/* Compact Telemetry Metrics Badges */}
          <div className="flex items-center gap-2.5 text-xs shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#133024]/70 dark:bg-[#0A0A0A] border border-[#3E8063]/60 dark:border-[#202020] text-white backdrop-blur-[2px]">
              <span className="text-[#C0D8C6] dark:text-[#858585] text-[11px] font-medium">Campus Load:</span>
              <span className="font-mono font-bold text-white dark:text-[#F5F5F5] tabular-nums">{avgCapacity}%</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#133024]/70 dark:bg-[#0A0A0A] border border-[#3E8063]/60 dark:border-[#202020] text-white backdrop-blur-[2px]">
              <span className="text-[#C0D8C6] dark:text-[#858585] text-[11px] font-medium">Active Nodes:</span>
              <span className="font-mono font-bold text-white dark:text-[#F5F5F5] tabular-nums">{totalCount}/6</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid: 3 Refined Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Metric 1: Total Bins Monitored */}
        <Card className="relative overflow-hidden border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#CDD3C7] dark:hover:border-[#282828] transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-2">
            <span className="text-[11px] font-bold text-[#5F6962] dark:text-[#858585] tracking-wider uppercase">
              Total Monitored Bins
            </span>
            <Badge variant="normal" className="text-[10px]">
              Fleet
            </Badge>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#202923] dark:text-[#F5F5F5] font-mono tracking-tight tabular-nums flex items-baseline gap-1">
              {totalCount > 0 ? (
                <NumberTicker value={totalCount} />
              ) : (
                '—'
              )}
              <span className="text-xs font-sans font-normal text-[#848F87] dark:text-[#858585]">units</span>
            </div>
            <p className="text-xs text-[#5F6962] dark:text-[#858585] mt-1.5 leading-relaxed">
              Active telemetry nodes installed across facilities
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Bins Requiring Collection */}
        <Card className="relative overflow-hidden border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#CDD3C7] dark:hover:border-[#282828] transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-2">
            <span className="text-[11px] font-bold text-[#5F6962] dark:text-[#858585] tracking-wider uppercase">
              Needing Collection
            </span>
            <Badge
              variant={actionCount > 0 ? 'warning' : 'normal'}
              className="text-[10px]"
              dot={actionCount > 0}
            >
              {totalCount === 0 ? '—' : actionCount > 0 ? `${actionCount} Due` : 'Nominal'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono tracking-tight tabular-nums flex items-baseline gap-1 text-[#8F6B2A] dark:text-[#D4AF67]">
              {totalCount > 0 ? (
                <NumberTicker value={actionCount} />
              ) : (
                '—'
              )}
              <span className="text-xs font-sans font-normal text-[#848F87] dark:text-[#858585]">queued</span>
            </div>
            <p className="text-xs text-[#5F6962] dark:text-[#858585] mt-1.5 leading-relaxed">
              Bins reaching or exceeding warning limit (&ge;{thresholds.warning}%)
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Critical Fill Levels (With Magic UI BorderBeam on alert, spans 2 cols on tablet portrait) */}
        <Card className="relative overflow-hidden sm:max-lg:col-span-2 border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#CDD3C7] dark:hover:border-[#282828] transition-all">
          {criticalCount > 0 && (
            <BorderBeam
              size={140}
              duration={6}
              colorFrom={isDark ? '#D9736C' : '#9E3E37'}
              colorTo="transparent"
            />
          )}
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-2">
            <span className="text-[11px] font-bold text-[#9E3E37] dark:text-[#D9736C] tracking-wider uppercase flex items-center gap-1">
              {criticalCount > 0 && <Flame className="w-3.5 h-3.5 text-[#9E3E37] dark:text-[#D9736C]" />}
              Critical Fill Levels
            </span>
            <Badge
              variant={criticalCount > 0 ? 'critical' : 'normal'}
              className="text-[10px]"
              dot={criticalCount > 0}
              pulse={criticalCount > 0}
            >
              {criticalCount > 0 ? 'Immediate Action' : 'Clear'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight tabular-nums flex items-baseline gap-1 text-[#9E3E37] dark:text-[#D9736C]">
              {totalCount > 0 ? (
                <NumberTicker value={criticalCount} />
              ) : (
                '—'
              )}
              <span className="text-xs font-sans font-normal text-[#848F87] dark:text-[#858585]">urgent</span>
            </div>
            <p className="text-xs text-[#5F6962] dark:text-[#858585] mt-1.5 leading-relaxed">
              Overflow risk (&ge;{thresholds.critical}%) requiring immediate dispatch
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integrated Fleet Status Distribution Bar (21st.dev pattern) */}
      <Card className="border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <CardContent className="p-4 sm:p-5">
          <SegmentedBar
            segments={segments}
            total={totalCount}
            activeKey={selectedTierFilter}
            onSelectSegment={(key) => setSelectedTierFilter(prev => prev === key ? null : key)}
          />
          {selectedTierFilter && (
            <div className="mt-2.5 pt-2 border-t border-[#F0F2ED] dark:border-[#202020] flex items-center justify-between text-xs text-[#5F6962] dark:text-[#858585]">
              <span>
                Filtered by: <strong className="capitalize text-[#202923] dark:text-[#F5F5F5]">{selectedTierFilter}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTierFilter(null)}
                className="h-6 px-2 text-xs text-[#245C43] dark:text-[#86B99A] hover:bg-[#E7EFE8] dark:hover:bg-[#0A0A0A]"
              >
                Reset filter (Show all)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Section: Precision Collection Board */}
      <Card className="border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E3E8E1] dark:border-[#202020] p-4 sm:p-5 pb-3 sm:pb-3.5 gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
              <AlertTriangle className="w-4 h-4 text-[#8F6B2A] dark:text-[#D4AF67]" />
              Collection Priorities Board
            </CardTitle>
            <CardDescription className="text-xs text-[#5F6962] dark:text-[#858585] mt-0.5 leading-relaxed">
              Priority-sequenced dispatch order based on live ultrasonic sensor telemetry
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ShimmerButton
              size="sm"
              onClick={() => onNavigate('routes')}
              className="w-full sm:w-auto min-h-[40px] sm:min-h-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
              <span>Plan Route</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </ShimmerButton>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {totalCount === 0 ? (
            <div className="py-12 px-4 text-center dark:bg-dot-grid-subtle">
              <Package className="w-8 h-8 text-[#848F87] dark:text-[#858585] mx-auto mb-2" />
              <h4 className="text-xs sm:text-sm font-semibold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
                {connectionStatus === 'connecting'
                  ? 'Connecting to database...'
                  : connectionStatus === 'connected'
                  ? 'No bins currently recorded'
                  : 'Monitoring stream unavailable'}
              </h4>
              <p className="text-xs text-[#5F6962] dark:text-[#858585] max-w-sm mx-auto mt-1 leading-relaxed">
                {connectionStatus === 'connecting'
                  ? 'Synchronizing telemetry stream...'
                  : connectionStatus === 'connected'
                  ? 'Bin data will populate automatically from Firebase.'
                  : 'Please check connection settings.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E3E8E1] dark:divide-[#202020]">
              {displayBins.map((bin) => {
                const status = getBinStatus(bin.fillLevel, thresholds);
                const freshness = getBinFreshness(bin.id, bin.lastUpdated);
                const binNum = bin.id.replace('BIN-', '');
                const fill = Number(bin.fillLevel) || 0;
                const isCritical = status.tier === 'critical';
                const isWarning = status.tier === 'warning';

                return (
                  <div
                    key={bin.id}
                    onClick={() => onSelectBin(bin)}
                    className={`p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A] cursor-pointer transition-colors ${
                      isCritical
                        ? 'border-l-[3px] border-l-[#9E3E37] dark:border-l-[#D9736C] bg-[#FCFBFB] dark:bg-[#150A0A]'
                        : isWarning
                        ? 'border-l-[3px] border-l-[#8F6B2A] dark:border-l-[#D4AF67] bg-[#FCFBF8] dark:bg-[#120E06]'
                        : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    {/* Left: Node Info, Location & Badges */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-white font-bold text-xs flex items-center justify-center font-mono tabular-nums shrink-0 shadow-xs ${status.dotClass}`}
                      >
                        {binNum}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-xs sm:text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
                            Bin {binNum}
                          </span>
                          <span className="text-[11px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums">
                            ({bin.id})
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${status.badgeClass}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#5F6962] dark:text-[#B3B3B3] flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-[#848F87] dark:text-[#858585] shrink-0" />
                          <span className="truncate">{bin.location}</span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Precision Threshold Gauge & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-6 w-full sm:w-auto pl-10 sm:pl-0">
                      {/* Precision Threshold Gauge with Milestone Ticks */}
                      <div className="flex-1 sm:flex-initial w-auto sm:w-44 min-w-[110px]">
                        <ThresholdGauge
                          fillLevel={fill}
                          thresholds={thresholds}
                        />
                      </div>

                      {/* Timestamp */}
                      <div className="hidden lg:block text-right text-[11px] text-[#848F87] dark:text-[#858585] min-w-[70px]">
                        <span className="flex items-center justify-end gap-1 font-mono tabular-nums">
                          <Clock className="w-3 h-3" />
                          {freshness.displayText}
                        </span>
                      </div>

                      {/* Action Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 sm:h-7 min-h-[36px] sm:min-h-0 text-xs font-semibold text-[#245C43] dark:text-[#86B99A] hover:text-[#1D4B36] dark:hover:text-[#9BC7AD] hover:bg-[#E7EFE8] dark:hover:bg-[#0A0A0A] gap-1 px-2.5 sm:px-2 cursor-pointer shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBin(bin);
                        }}
                      >
                        <span className="inline">Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
