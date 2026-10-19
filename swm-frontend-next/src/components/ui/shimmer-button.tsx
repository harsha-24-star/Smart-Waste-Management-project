import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'default' | 'lg';
  shimmerColor?: string;
  duration?: string;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      className,
      children,
      size = 'default',
      duration = '3s',
      disabled = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Sizing mapping for outer button container and inner content padding
    const sizeClasses = {
      sm: 'h-7 sm:h-8 rounded-md text-xs',
      default: 'h-8 sm:h-9 rounded-md text-xs sm:text-sm',
      lg: 'h-9 sm:h-10 rounded-lg text-sm',
    }[size];

    const innerPadding = {
      sm: 'px-2.5 sm:px-3 rounded-[5px]',
      default: 'px-3.5 sm:px-4 rounded-[5px]',
      lg: 'px-4 sm:px-5 rounded-[7px]',
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'group relative inline-flex items-center justify-center overflow-hidden p-[1px] font-semibold tracking-tight transition-transform select-none cursor-pointer',
          'bg-[#1D4B36] dark:bg-[#202020]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86B99A]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000]',
          'active:scale-[0.98] active:translate-y-px',
          'disabled:pointer-events-none disabled:opacity-45',
          sizeClasses,
          className
        )}
        {...props}
      >
        {/* Continuous perimeter traveling shimmer beam (Aceternity perimeter highlight) */}
        <span
          aria-hidden="true"
          className="absolute inset-[-1000%] animate-shimmer-spin pointer-events-none motion-reduce:hidden group-disabled:hidden"
          style={{
            animationDuration: duration,
            background:
              'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 45deg, rgba(134,185,154,0.3) 75deg, rgba(255,255,255,0.95) 90deg, rgba(134,185,154,0.3) 105deg, transparent 135deg, transparent 360deg)',
          }}
        />

        {/* Solid near-black interior surface with crisp readable white typography */}
        <span
          className={cn(
            'relative z-10 inline-flex h-full w-full items-center justify-center gap-1.5 transition-colors',
            // Light mode: Deep forest green brand fill
            'bg-[#245C43] text-white group-hover:bg-[#1D4B36]',
            // Dark mode: Near-black #080808 fill with subtle hover elevation to #0A0A0A
            'dark:bg-[#080808] dark:text-[#F5F5F5] dark:group-hover:bg-[#0A0A0A] dark:group-hover:text-white',
            innerPadding
          )}
        >
          {children}
        </span>
      </button>
    );
  }
);

ShimmerButton.displayName = 'ShimmerButton';
