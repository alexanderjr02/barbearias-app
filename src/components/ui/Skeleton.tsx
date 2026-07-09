import { cn } from "@/lib/utils";

// Generic pulsing placeholder shaped by the caller via className (height,
// width, rounding) — used in loading states across the dashboard so content
// pops in where a skeleton was, instead of numbers jumping from 0 to real.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-zinc-800 rounded", className)} />;
}
