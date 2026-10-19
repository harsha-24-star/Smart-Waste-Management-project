import React, { useState } from 'react';
import { BarChart3, TrendingUp, Download, Check } from 'lucide-react';
import type { Bin, ThresholdConfig } from '../../types';
import { getBinStatus } from '../../lib/status';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { ThresholdGauge } from '../ui/threshold-gauge';
import { ShimmerButton } from '../ui/shimmer-button';

interface AnalyticsPlaceholderProps {
  bins: Bin[];
  thresholds: ThresholdConfig;
  onSelectBin: (bin: Bin) => void;
}

export const AnalyticsPlaceholder: React.FC<AnalyticsPlaceholderProps> = ({
  bins,
  thresholds,
  onSelectBin,
}) => {
  const [isExported, setIsExported] = useState(false);

  const handleExport = () => {
    setIsExported(true);
    const headers = ['Bin ID', 'Location', 'Fill Level (%)', 'Status Tier', 'Timestamp'];
    const rows = bins.map((b) => [
      b.id,
      `"${b.location}"`,
      b.fillLevel,
      getBinStatus(b.fillLevel, thresholds).tier,
      `"${b.lastUpdated || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `swm-telemetry-audit-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExported(false), 2500);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Analytics Banner */}
      <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-[#080808] border border-[#E3E8E1] dark:border-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-[#E7EFE8] dark:bg-[#0E1A13] text-[#245C43] dark:text-[#86B99A] flex items-center gap-1 border border-[#CBDDCF] dark:border-[#172D20]">
            <TrendingUp className="w-3 h-3" /> Predictive Horizons
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-[#F0F2ED] dark:bg-[#0A0A0A] text-[#5F6962] dark:text-[#858585] border border-[#E3E8E1] dark:border-[#202020]">
            Fleet Projections
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
              Fill-Level Projections &amp; Depletion Horizons
            </h2>
            <p className="text-xs text-[#5F6962] dark:text-[#858585] max-w-2xl mt-1 leading-relaxed">
              Urgency windows projected from real-time ultrasonic sensor measurements and configured operational thresholds to forecast capacity limits before dispatch.
            </p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <ShimmerButton
              size="sm"
              onClick={handleExport}
              disabled={bins.length === 0}
              className="w-full sm:w-auto min-h-[40px] sm:min-h-0"
            >
              {isExported ? <Check className="w-3.5 h-3.5 mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
              <span>{isExported ? 'Audit Exported' : 'Export Audit'}</span>
            </ShimmerButton>
          </div>
        </div>
      </div>

      {/* Campus Fill Projections: Responsive Mobile Cards (<md) & Data Table (md+) */}
      <Card className="border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <CardHeader className="border-b border-[#E3E8E1] dark:border-[#202020] p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5]">
                Campus Fill Projections
              </CardTitle>
              <CardDescription className="text-xs text-[#5F6962] dark:text-[#858585] mt-0.5 leading-relaxed">
                Estimated overflow urgency windows based on current telemetry
              </CardDescription>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E7EFE8] dark:bg-[#0E1A13] text-[#245C43] dark:text-[#86B99A] border border-[#CBDDCF] dark:border-[#172D20]">
              Active Projections
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {bins.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#848F87] dark:text-[#858585] dark:bg-dot-grid-subtle">
              Awaiting bin telemetry to generate fill projections.
            </div>
          ) : (
            <>
              {/* Mobile Card List (< md) */}
              <div className="block md:hidden divide-y divide-[#E3E8E1] dark:divide-[#202020]">
                {bins.map((bin) => {
                  const status = getBinStatus(bin.fillLevel, thresholds);
                  const binNum = bin.id.replace('BIN-', '');
                  const fill = Number(bin.fillLevel) || 0;

                  let overflowEstimate = 'Nominal (> 36h)';
                  let estTime = '> 36 hours';
                  if (fill >= thresholds.critical) {
                    overflowEstimate = 'Immediate (At Limit)';
                    estTime = '< 1 hour';
                  } else if (fill >= thresholds.warning) {
                    overflowEstimate = 'Today (Evening)';
                    estTime = '~3 - 4 hours';
                  } else if (fill >= thresholds.medium || fill > thresholds.normal) {
                    overflowEstimate = 'Tomorrow (Morning)';
                    estTime = '~14 - 18 hours';
                  }

                  return (
                    <div
                      key={bin.id}
                      onClick={() => onSelectBin(bin)}
                      className="p-3.5 space-y-2.5 cursor-pointer hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-[#202923] dark:text-[#F5F5F5]">
                              Bin {binNum}
                            </span>
                            <span className="text-[11px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums">
                              ({bin.id})
                            </span>
                          </div>
                          <span className="text-xs text-[#5F6962] dark:text-[#B3B3B3] block truncate">
                            {bin.location}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-sm text-[#202923] dark:text-[#F5F5F5] tabular-nums block">
                            {fill}%
                          </span>
                          <span className={`text-[11px] font-semibold ${
                            status.tier === 'critical' ? 'text-[#9E3E37] dark:text-[#D9736C]' :
                            status.tier === 'warning' ? 'text-[#8F6B2A] dark:text-[#D4AF67]' :
                            status.tier === 'medium' ? 'text-[#2F5C78] dark:text-[#7FA8C4]' : 'text-[#245C43] dark:text-[#86B99A]'
                          }`}>
                            {status.risk}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F0F2ED] dark:border-[#202020] text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.badgeClass}`}>
                          {overflowEstimate}
                        </span>
                        <span className="font-mono tabular-nums text-[11px] text-[#5F6962] dark:text-[#B3B3B3]">
                          Window: <strong>{estTime}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Data Table (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F8F5] dark:bg-[#000000] border-b border-[#E3E8E1] dark:border-[#202020] text-[#5F6962] dark:text-[#858585] font-bold uppercase tracking-wider text-[10px] sm:text-[11px]">
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Bin Node</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Location</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Current Fill</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Estimated Horizon</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Window</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4">Risk Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8E1] dark:divide-[#202020]">
                    {bins.map((bin) => {
                      const status = getBinStatus(bin.fillLevel, thresholds);
                      const binNum = bin.id.replace('BIN-', '');
                      const fill = Number(bin.fillLevel) || 0;

                      let overflowEstimate = 'Nominal (> 36h)';
                      let estTime = '> 36 hours';
                      if (fill >= thresholds.critical) {
                        overflowEstimate = 'Immediate (At Limit)';
                        estTime = '< 1 hour';
                      } else if (fill >= thresholds.warning) {
                        overflowEstimate = 'Today (Evening)';
                        estTime = '~3 - 4 hours';
                      } else if (fill >= thresholds.medium || fill > thresholds.normal) {
                        overflowEstimate = 'Tomorrow (Morning)';
                        estTime = '~14 - 18 hours';
                      }

                      return (
                        <tr
                          key={bin.id}
                          onClick={() => onSelectBin(bin)}
                          className="hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A] cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-[#202923] dark:text-[#F5F5F5]">
                            <div className="flex items-center gap-1.5">
                              <span className="tracking-tight text-xs sm:text-[13px]">Bin {binNum}</span>
                              <span className="text-[11px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums">({bin.id})</span>
                            </div>
                          </td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-[#202923] dark:text-[#F5F5F5] text-xs sm:text-[13px]">{bin.location}</td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono font-bold tabular-nums text-[#202923] dark:text-[#F5F5F5]">{fill}%</td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.badgeClass}`}>
                              {overflowEstimate}
                            </span>
                          </td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono tabular-nums text-[#5F6962] dark:text-[#B3B3B3]">{estTime}</td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                            <span className={`font-semibold text-xs ${
                              status.tier === 'critical' ? 'text-[#9E3E37] dark:text-[#D9736C]' :
                              status.tier === 'warning' ? 'text-[#8F6B2A] dark:text-[#D4AF67]' :
                              status.tier === 'medium' ? 'text-[#2F5C78] dark:text-[#7FA8C4]' : 'text-[#245C43] dark:text-[#86B99A]'
                            }`}>
                              {status.risk}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Fleet Capacity & Comparison with ThresholdGauge */}
      <Card className="border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <CardHeader className="border-b border-[#E3E8E1] dark:border-[#202020] p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#245C43] dark:text-[#86B99A]" />
            Fleet Capacity Comparison
          </CardTitle>
          <CardDescription className="text-xs text-[#5F6962] dark:text-[#858585] mt-0.5 leading-relaxed">
            Recorded bin fill levels benchmarked against configured status thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          {bins.length === 0 ? (
            <p className="text-xs text-[#848F87] dark:text-[#858585] text-center py-4 dark:bg-dot-grid-subtle rounded-md">No bins currently recorded.</p>
          ) : (
            bins.map((bin) => {
              const binNum = bin.id.replace('BIN-', '');
              const fill = Number(bin.fillLevel) || 0;

              return (
                <div
                  key={bin.id}
                  onClick={() => onSelectBin(bin)}
                  className="p-2.5 rounded-md hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A] cursor-pointer transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#202923] dark:text-[#F5F5F5] flex items-center gap-2">
                      <span className="tracking-tight">Bin {binNum} &bull; <span className="font-normal text-[#5F6962] dark:text-[#B3B3B3]">{bin.location}</span></span>
                    </span>
                    <span className="font-mono font-bold tabular-nums text-[#202923] dark:text-[#F5F5F5]">{fill}%</span>
                  </div>
                  <ThresholdGauge
                    fillLevel={fill}
                    thresholds={thresholds}
                    showValue={false}
                  />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};
