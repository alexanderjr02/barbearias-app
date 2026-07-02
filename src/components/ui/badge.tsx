import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        success: "bg-green-500/20 text-green-400 border border-green-500/30",
        danger: "bg-red-500/20 text-red-400 border border-red-500/30",
        warning: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
        info: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        gray: "bg-zinc-700/50 text-zinc-400 border border-zinc-600",
        purple: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
