import React from 'react';
import { cn } from '../../lib/utils';

export interface Segment {
  key: string;
  label: string;
  count: number;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

interface SegmentedBarProps {
  segments: Segment[];
  total: number;
  className?: string;
  activeKey?: string | null;
  onSelectSegment?: (key: string) => void;
}

export const SegmentedBar: React.FC<SegmentedBarProps> = ({
  segments,
  total,
  className,
  activeKey,
  onSelectSegment,
}) => {
  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Header Info / Interactive Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-[#202923] dark:text-[#F5F5F5]">Fleet Status Breakdown</span>
          <span className="text-[11px] text-[#848F87] dark:text-[#858585] font-mono tabular-nums">
            ({total} monitored units)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {segments.map((seg) => {
            const pct = total > 0 ? ((seg.count / total) * 100).toFixed(0) : 0;
            const isSelected = activeKey === seg.key;

            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => onSelectSegment && onSelectSegment(seg.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 sm:px-2 py-1 sm:py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer border min-h-[32px] sm:min-h-0',
                  seg.bgColor,
                  seg.textColor,
                  seg.borderColor,
                  isSelected ? 'ring-1 ring-[#245C43] dark:ring-[#86B99A] shadow-xs' : 'hover:opacity-90'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', seg.color)} />
                <span>{seg.label}</span>
                <span className="font-mono font-bold ml-0.5 tabular-nums">{seg.count}</span>
                <span className="text-[10px] opacity-75 font-mono tabular-nums">({pct}%)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Continuous Segmented Bar */}
      <div className="h-2 w-full rounded-full bg-[#F0F2ED] dark:bg-[#141414] overflow-hidden flex">
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={seg.key}
              className={cn('h-full transition-all duration-500 ease-out', seg.color)}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${seg.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
    </div>
  );
};
