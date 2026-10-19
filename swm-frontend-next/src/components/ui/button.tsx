import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { ShimmerButton } from './shimmer-button';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs sm:text-sm font-semibold tracking-tight transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#245C43] dark:focus-visible:ring-[#86B99A] disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.99]',
  {
    variants: {
      variant: {
        default:
          'bg-[#245C43] text-white hover:bg-[#1D4B36] active:bg-[#163829] dark:bg-[#86B99A] dark:text-[#000000] dark:hover:bg-[#97C5A9] shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
        primary: '', // Handled by ShimmerButton delegation
        shimmer: '', // Handled by ShimmerButton delegation
        secondary:
          'bg-[#F0F2ED] text-[#202923] hover:bg-[#E8ECE5] border border-[#E3E8E1] dark:bg-[#0A0A0A] dark:text-[#F5F5F5] dark:hover:bg-[#141414] dark:border-[#202020]',
        outline:
          'border border-[#E3E8E1] bg-white text-[#202923] hover:bg-[#F7F8F5] hover:border-[#CDD3C7] dark:border-[#202020] dark:bg-[#080808] dark:text-[#F5F5F5] dark:hover:bg-[#0A0A0A] dark:hover:border-[#282828]',
        ghost:
          'text-[#5F6962] hover:text-[#202923] hover:bg-[#F0F2ED] dark:text-[#B3B3B3] dark:hover:text-[#F5F5F5] dark:hover:bg-[#0A0A0A]',
        destructive:
          'bg-[#FAECEB] text-[#9E3E37] hover:bg-[#F6DAD8] border border-[#ECCDCB] dark:bg-[#1F0D0D] dark:text-[#D9736C] dark:hover:bg-[#2A1212] dark:border-[#331616]',
      },
      size: {
        default: 'h-8 sm:h-9 px-3 sm:px-4 py-1.5 sm:py-2',
        sm: 'h-7 sm:h-8 rounded-md px-2.5 sm:px-3 text-xs',
        lg: 'h-9 sm:h-10 rounded-md px-5 sm:px-6',
        icon: 'h-8 w-8 p-0 rounded-md shrink-0 inline-flex items-center justify-center',
        'icon-sm': 'h-7 w-7 p-0 rounded-md shrink-0 inline-flex items-center justify-center text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    // Primary / Shimmer actions delegate to perimeter-beam ShimmerButton
    if (variant === 'primary' || variant === 'shimmer') {
      const shimmerSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'default';
      return (
        <ShimmerButton
          ref={ref}
          size={shimmerSize}
          className={className}
          {...props}
        >
          {children}
        </ShimmerButton>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
