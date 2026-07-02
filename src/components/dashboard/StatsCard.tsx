import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "text-amber-400",
  description,
}: StatsCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-amber-500/10"
          )}
        >
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {change && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              changeType === "positive" &&
                "bg-green-500/10 text-green-400",
              changeType === "negative" &&
                "bg-red-500/10 text-red-400",
              changeType === "neutral" && "bg-zinc-800 text-zinc-400"
            )}
          >
            {changeType === "positive" && (
              <TrendingUp className="w-3 h-3" />
            )}
            {changeType === "negative" && (
              <TrendingDown className="w-3 h-3" />
            )}
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-zinc-500">{title}</p>
        {description && (
          <p className="text-xs text-zinc-600 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
