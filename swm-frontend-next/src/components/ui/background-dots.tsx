import React from 'react';
import { cn } from '../../lib/utils';

interface BackgroundDotsProps {
  className?: string;
  children?: React.ReactNode;
  /** Whether to render subtle radial fade mask (Aceternity UI style) */
  fade?: boolean;
}

/**
 * Recreates the official Aceternity UI Background Dots effect using pure CSS
 * radial gradients with a charcoal-green base and muted sage dot matrix.
 * Pure CSS, zero dependencies, pointer-events none, accessible.
 */
export const BackgroundDots: React.FC<BackgroundDotsProps> = ({
  className,
  children,
  fade = false,
}) => {
  return (
    <div className={cn('relative', className)}>
      {/* Background Dots Layer (Dark theme only, transparent in light theme) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 hidden dark:block bg-dot-grid"
      />
      {fade && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 hidden dark:block [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] bg-[#141B18]"
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default BackgroundDots;
