import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#0f2c59] text-white',
        secondary: 'border-transparent bg-slate-100 text-slate-800',
        destructive: 'border-transparent bg-red-100 text-red-800 border-red-300',
        outline: 'text-slate-800 border-slate-300',
        ewsGreen: 'border-green-300 bg-green-50 text-green-800',
        ewsYellow: 'border-yellow-300 bg-yellow-50 text-yellow-800',
        ewsRed: 'border-red-300 bg-red-50 text-red-800',
        ganttBaseline: 'border-slate-300 bg-slate-100 text-slate-700',
        ganttRev1: 'border-yellow-400 bg-yellow-100 text-yellow-900',
        ganttRev2: 'border-orange-400 bg-orange-100 text-orange-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
