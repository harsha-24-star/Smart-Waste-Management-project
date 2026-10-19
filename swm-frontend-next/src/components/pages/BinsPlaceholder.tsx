import React, { useState } from 'react';
import { Search, MapPin, Clock, ArrowUpRight, Package, X } from 'lucide-react';
import type { Bin, ThresholdConfig, StatusTier } from '../../types';
import { getBinStatus } from '../../lib/status';
import { getBinFreshness } from '../../lib/telemetry';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ThresholdGauge } from '../ui/threshold-gauge';
import { cn } from '../../lib/utils';

interface BinsPlaceholderProps {
  bins: Bin[];
  thresholds: ThresholdConfig;
  onSelectBin: (bin: Bin) => void;
}

export const BinsPlaceholder: React.FC<BinsPlaceholderProps> = ({
  bins,
  thresholds,
  onSelectBin,
}) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | StatusTier>('all');

  const filteredBins = bins.filter((bin) => {
    const status = getBinStatus(bin.fillLevel, thresholds);
    if (activeFilter !== 'all' && status.tier !== activeFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        bin.id.toLowerCase().includes(q) ||
        bin.location.toLowerCase().includes(q) ||
        (bin.sensorId && bin.sensorId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Card */}
      <div className="p-3.5 sm:p-4 bg-white dark:bg-[#080808] rounded-lg border border-[#E3E8E1] dark:border-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#848F87] dark:text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by bin ID, location, or sensor ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9 text-xs sm:text-sm h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#848F87] dark:text-[#858585] hover:text-[#202923] dark:hover:text-[#F5F5F5] rounded-md transition-colors cursor-pointer"
                aria-label="Clear search input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className={`text-xs h-7 sm:h-8 ${activeFilter === 'all' ? 'bg-[#245C43] dark:bg-[#86B99A] text-white dark:text-[#000000]' : 'dark:bg-[#0A0A0A] dark:text-[#F5F5F5] dark:border-[#202020]'}`}
            >
              All Bins ({bins.length})
            </Button>
            <Button
              variant={activeFilter === 'normal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('normal')}
              className={`text-xs h-7 sm:h-8 ${
                activeFilter === 'normal' 
                  ? 'bg-[#245C43] dark:bg-[#0E1A13] text-white dark:text-[#86B99A] dark:border-[#172D20]' 
                  : 'text-[#245C43] dark:text-[#86B99A] border-[#CBDDCF] dark:border-[#172D20] hover:bg-[#E7EFE8] dark:hover:bg-[#0A0A0A]'
              }`}
            >
              Normal (&le;{thresholds.normal}%)
            </Button>
            <Button
              variant={activeFilter === 'medium' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('medium')}
              className={`text-xs h-7 sm:h-8 ${
                activeFilter === 'medium' 
                  ? 'bg-[#2F5C78] dark:bg-[#0E161F] text-white dark:text-[#7FA8C4] dark:border-[#162635]' 
                  : 'text-[#2F5C78] dark:text-[#7FA8C4] border-[#C6DDEB] dark:border-[#162635] hover:bg-[#EAF2F7] dark:hover:bg-[#0A0A0A]'
              }`}
            >
              Medium
            </Button>
            <Button
              variant={activeFilter === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('warning')}
              className={`text-xs h-7 sm:h-8 ${
                activeFilter === 'warning' 
                  ? 'bg-[#8F6B2A] dark:bg-[#1C1508] text-white dark:text-[#D4AF67] dark:border-[#2E230E]' 
                  : 'text-[#8F6B2A] dark:text-[#D4AF67] border-[#EEDCC0] dark:border-[#2E230E] hover:bg-[#FAF3E7] dark:hover:bg-[#0A0A0A]'
              }`}
            >
              Nearly Full
            </Button>
            <Button
              variant={activeFilter === 'critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('critical')}
              className={`text-xs h-7 sm:h-8 ${
                activeFilter === 'critical' 
                  ? 'bg-[#9E3E37] dark:bg-[#1F0D0D] text-white dark:text-[#D9736C] dark:border-[#331616]' 
                  : 'text-[#9E3E37] dark:text-[#D9736C] border-[#ECCDCB] dark:border-[#331616] hover:bg-[#FAECEB] dark:hover:bg-[#0A0A0A]'
              }`}
            >
              Critical (&ge;{thresholds.critical}%)
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#F0F2ED] dark:border-[#202020] text-xs text-[#5F6962] dark:text-[#858585]">
          <span>
            Showing <strong className="text-[#202923] dark:text-[#F5F5F5] font-mono tabular-nums">{filteredBins.length}</strong> of{' '}
            <strong className="text-[#202923] dark:text-[#F5F5F5] font-mono tabular-nums">{bins.length}</strong> monitored campus bins
          </span>
          <div className="hidden md:flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#245C43] dark:bg-[#86B99A]" /> Normal</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2F5C78] dark:bg-[#7FA8C4]" /> Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#8F6B2A] dark:bg-[#D4AF67]" /> Nearly Full</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#9E3E37] dark:bg-[#D9736C]" /> Critical</span>
          </div>
        </div>
      </div>

      {/* Structured Bins Presentation: Responsive Cards on Mobile (<md), Full Data Table on Desktop (md+) */}
      <div className="bg-white dark:bg-[#080808] rounded-lg border border-[#E3E8E1] dark:border-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {filteredBins.length === 0 ? (
          <div className="py-10 px-4 text-center dark:bg-dot-grid-subtle">
            <Package className="w-7 h-7 text-[#848F87] dark:text-[#858585] mx-auto mb-2" />
            <h4 className="text-xs sm:text-sm font-semibold text-[#202923] dark:text-[#F5F5F5]">
              {bins.length === 0 ? 'No bins found' : 'No bins matching current filter'}
            </h4>
            <p className="text-xs text-[#5F6962] dark:text-[#858585] max-w-sm mx-auto mt-1">
              {bins.length === 0 
                ? 'Bin readings will display here once recorded by the monitoring system.'
                : 'Try adjusting your search query or filter selection.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="block md:hidden divide-y divide-[#E3E8E1] dark:divide-[#202020]">
              {filteredBins.map((bin) => {
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
                    className={cn(
                      'p-3.5 space-y-3 cursor-pointer hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A] transition-colors',
                      isCritical
                        ? 'border-l-[3px] border-l-[#9E3E37] dark:border-l-[#D9736C] bg-[#FCFBFB] dark:bg-[#150A0A]'
                        : isWarning
                        ? 'border-l-[3px] border-l-[#8F6B2A] dark:border-l-[#D4AF67] bg-[#FCFBF8] dark:bg-[#120E06]'
                        : 'border-l-[3px] border-l-transparent'
                    )}
                  >
                    {/* Card Top: Node Badge, ID, Status, & Inspect Button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded text-white font-bold text-xs flex items-center justify-center font-mono tabular-nums shrink-0 shadow-xs ${status.dotClass}`}
                        >
                          {binNum}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold tracking-tight text-xs text-[#202923] dark:text-[#F5F5F5]">
                              Bin {binNum}
                            </span>
                            <span className="text-[11px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums">
                              ({bin.id})
                            </span>
                          </div>
                          <span className="text-[11px] text-[#5F6962] dark:text-[#B3B3B3] flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-[#848F87] dark:text-[#858585] shrink-0" />
                            <span className="truncate">{bin.location}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 min-h-[36px] px-2 text-xs font-semibold text-[#245C43] dark:text-[#86B99A]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBin(bin);
                          }}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Card Middle: Full-width Threshold Gauge */}
                    <div className="pt-1">
                      <ThresholdGauge
                        fillLevel={fill}
                        thresholds={thresholds}
                        showTicks={true}
                        showValue={true}
                      />
                    </div>

                    {/* Card Bottom: Metadata and Stale Warning */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#F0F2ED] dark:border-[#202020] text-[11px]">
                      <span className="font-mono tabular-nums text-[10px] text-[#5F6962] dark:text-[#B3B3B3] bg-[#F0F2ED] dark:bg-[#0A0A0A] px-1.5 py-0.5 rounded border border-[#E3E8E1] dark:border-[#202020]">
                        Sensor: {bin.sensorId || 'ESP32'}
                      </span>
                      <div className={cn(
                        'flex items-center gap-1 font-mono tabular-nums',
                        freshness.status === 'stale' ? 'text-[#8F6B2A] dark:text-[#D4AF67] font-semibold' :
                        freshness.status === 'offline' ? 'text-[#9E3E37] dark:text-[#D9736C] font-semibold' :
                        'text-[#848F87] dark:text-[#858585]'
                      )}>
                        <Clock className="w-3 h-3" />
                        <span>{freshness.displayText}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Full Data Table (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F8F5] dark:bg-[#000000] border-b border-[#E3E8E1] dark:border-[#202020] text-[#5F6962] dark:text-[#858585] font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Bin Node</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Location</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 min-w-[150px]">Fill Level &amp; Gauge</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Status Tier</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Sensor Node</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Last Reading</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8E1] dark:divide-[#202020]">
                  {filteredBins.map((bin) => {
                    const status = getBinStatus(bin.fillLevel, thresholds);
                    const freshness = getBinFreshness(bin.id, bin.lastUpdated);
                    const binNum = bin.id.replace('BIN-', '');
                    const fill = Number(bin.fillLevel) || 0;

                    return (
                      <tr
                        key={bin.id}
                        onClick={() => onSelectBin(bin)}
                        className="hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A] cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold tracking-tight text-xs sm:text-[13px] text-[#202923] dark:text-[#F5F5F5]">Bin {binNum}</span>
                            <span className="text-[11px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums">({bin.id})</span>
                          </div>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                          <span className="flex items-center gap-1.5 text-xs sm:text-[13px] text-[#202923] dark:text-[#F5F5F5]">
                            <MapPin className="w-3.5 h-3.5 text-[#848F87] dark:text-[#858585] shrink-0" />
                            <span>{bin.location}</span>
                          </span>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                          <div className="max-w-[160px]">
                            <ThresholdGauge
                              fillLevel={fill}
                              thresholds={thresholds}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                          <span className="font-mono tabular-nums text-[10px] sm:text-[11px] text-[#5F6962] dark:text-[#B3B3B3] bg-[#F0F2ED] dark:bg-[#0A0A0A] px-1.5 py-0.5 rounded border border-[#E3E8E1] dark:border-[#202020]">
                            {bin.sensorId || 'ESP32'}
                          </span>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-1.5 text-[#5F6962] dark:text-[#B3B3B3]">
                            <Clock className="w-3.5 h-3.5 text-[#848F87] dark:text-[#858585] shrink-0" />
                            <span className="font-mono tabular-nums">{freshness.displayText}</span>
                          </div>
                        </td>
                        <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 sm:h-7 text-xs font-semibold text-[#245C43] dark:text-[#86B99A] gap-1 hover:bg-[#E7EFE8] dark:hover:bg-[#0A0A0A] px-2 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBin(bin);
                            }}
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
