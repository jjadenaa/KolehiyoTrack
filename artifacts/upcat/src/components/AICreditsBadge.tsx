import React from "react";
import { useAIQuota } from "@/lib/aiQuota";
import { Sparkles, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AICreditsBadgeProps {
  compact?: boolean;
  className?: string;
}

export function AICreditsBadge({ compact = false, className }: AICreditsBadgeProps) {
  const { used, total, remaining, resetTimeStr, isExhausted, isLow, percentage } = useAIQuota();

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
          isExhausted
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
            : isLow
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
            : "bg-primary/10 text-primary border-primary/20",
          className
        )}
        title={`${remaining} of ${total} AI queries remaining today. Resets in ${resetTimeStr}.`}
      >
        <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
        <span>
          {remaining}/{total} AI Credits
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-3 rounded-xl border text-xs space-y-2 transition-all",
        isExhausted
          ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
          : isLow
          ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
          : "bg-muted/30 border-border text-muted-foreground",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-foreground">Daily AI Usage Limit</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-bold",
            isExhausted
              ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40"
              : isLow
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
              : "bg-primary/10 text-primary border-primary/20"
          )}
        >
          {remaining} of {total} Left
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300 rounded-full",
              isExhausted ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
          <span>{used} requests used today</span>
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> Resets in {resetTimeStr}
          </span>
        </div>
      </div>

      {isExhausted ? (
        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 pt-0.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Daily limit reached. Quota automatically refreshes at midnight.</span>
        </div>
      ) : isLow ? (
        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 pt-0.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Almost out of AI credits for today ({remaining} left).</span>
        </div>
      ) : null}
    </div>
  );
}
