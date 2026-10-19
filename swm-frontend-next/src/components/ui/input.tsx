import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 sm:h-8 w-full rounded-md border border-[#E3E8E1] dark:border-[#202020] bg-white dark:bg-[#0A0A0A] px-3 py-1 text-base sm:text-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#848F87] dark:placeholder:text-[#858585] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#245C43] dark:focus-visible:ring-[#86B99A] focus-visible:border-[#245C43] dark:focus-visible:border-[#86B99A] disabled:cursor-not-allowed disabled:opacity-50 text-[#202923] dark:text-[#F5F5F5]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
