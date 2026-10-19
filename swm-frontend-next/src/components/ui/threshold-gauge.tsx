import React from 'react';
import type { ThresholdConfig } from '../../types';
import { getBinStatus } from '../../lib/status';
import { cn } from '../../lib/utils';

interface ThresholdGaugeProps {
  fillLevel: number;
  thresholds: ThresholdConfig;
  className?: string;
  showTicks?: boolean;
  showValue?: boolean;
}

export const ThresholdGauge: React.FC<ThresholdGaugeProps> = ({
  fillLevel,
  thresholds,
  className,
  showTicks = true,
  showValue = true,
}) => {
  const level = Math.min(100, Math.max(0, Number(fillLevel) || 0));
  const status = getBinStatus(level, thresholds);

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex-1 h-2 bg-[#F0F2ED] dark:bg-[#141414] rounded-full overflow-visible">
        {/* Fill Track */}
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', status.dotClass)}
          style={{ width: `${level}%` }}
        />

        {/* Threshold Milestone Ticks */}
        {showTicks && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Warning Tick (e.g., 80%) */}
            <span
              className="absolute top-0 bottom-0 w-[1.5px] bg-[#8F6B2A]/40 dark:bg-[#D4AF67]/50 z-10"
              style={{ left: `${thresholds.warning}%` }}
              title={`Warning Threshold: ${thresholds.warning}%`}
            />
            {/* Critical Tick (e.g., 90%) */}
            <span
              className="absolute top-0 bottom-0 w-[1.5px] bg-[#9E3E37]/50 dark:bg-[#D9736C]/60 z-10"
              style={{ left: `${thresholds.critical}%` }}
              title={`Critical Threshold: ${thresholds.critical}%`}
            />
          </div>
        )}
      </div>

      {showValue && (
        <span className="font-mono font-bold text-xs tabular-nums text-[#202923] dark:text-[#F5F5F5] w-9 text-right shrink-0">
          {level}%
        </span>
      )}
    </div>
  );
};
