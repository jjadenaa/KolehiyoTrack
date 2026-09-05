import React from "react";
import { AILimitCounter } from "./AILimitCounter";

interface AICreditsBadgeProps {
  compact?: boolean;
  className?: string;
  showDetailsOnClick?: boolean;
}

export function AICreditsBadge({ 
  compact = false, 
  className,
  showDetailsOnClick = true 
}: AICreditsBadgeProps) {
  return (
    <AILimitCounter 
      compact={compact} 
      className={className} 
      showDetailsOnClick={showDetailsOnClick} 
    />
  );
}
