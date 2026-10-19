import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-tight transition-colors focus:outline-none select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#245C43] text-white dark:bg-[#86B99A] dark:text-[#000000]',
        secondary:
          'border-[#E3E8E1] bg-[#F0F2ED] text-[#202923] dark:border-[#202020] dark:bg-[#0A0A0A] dark:text-[#F5F5F5]',
        outline:
          'border-[#E3E8E1] text-[#5F6962] bg-white dark:border-[#202020] dark:text-[#B3B3B3] dark:bg-[#080808]',
        normal:
          'border-[#CBDDCF] bg-[#E7EFE8] text-[#245C43] dark:border-[#172D20] dark:bg-[#0E1A13] dark:text-[#86B99A]',
        medium:
          'border-[#C6DDEB] bg-[#EAF2F7] text-[#2F5C78] dark:border-[#162635] dark:bg-[#0E161F] dark:text-[#7FA8C4]',
        warning:
          'border-[#EEDCC0] bg-[#FAF3E7] text-[#8F6B2A] dark:border-[#2E230E] dark:bg-[#1C1508] dark:text-[#D4AF67]',
        critical:
          'border-[#ECCDCB] bg-[#FAECEB] text-[#9E3E37] dark:border-[#331616] dark:bg-[#1F0D0D] dark:text-[#D9736C]',
        stale:
          'border-[#EEDCC0] bg-[#FAF3E7] text-[#8F6B2A] dark:border-[#2E230E] dark:bg-[#1C1508] dark:text-[#D4AF67]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
  pulse?: boolean;
}

function Badge({ className, variant, dot = false, dotColor, pulse = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotColor || 'bg-current')} />
          )}
          <span className={cn('relative inline-flex rounded-full h-2 w-2', dotColor || 'bg-current')} />
        </span>
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
