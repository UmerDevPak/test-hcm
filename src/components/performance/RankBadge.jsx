"use client";

import React from "react";
import { Crown, Shield, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANK_CONFIG } from "@/lib/constants";

export function RankBadge({
  rank = "Rank B",
  size = "md",
  showIcon = true,
  showTier = false,
  className = "",
}) {
  const normalized = rank === "Rank A" || rank === "Rank B" || rank === "Rank C" ? rank : "Rank B";
  const config = RANK_CONFIG[normalized] || RANK_CONFIG["Rank B"];

  const icons = {
    "Rank A": Crown,
    "Rank B": Shield,
    "Rank C": Target,
  };
  const Icon = icons[normalized] || Shield;

  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1 font-medium",
    sm: "text-[11px] px-2 py-0.5 gap-1.5 font-medium",
    md: "text-xs px-2.5 py-1 gap-1.5 font-semibold",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-bold",
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border transition-all",
        config.badgeClasses,
        config.glowClasses,
        sizeClasses[size] || sizeClasses.md,
        className
      )}
      title={`${config.label} — ${config.description}`}
    >
      {showIcon && <Icon className={cn(iconSizes[size] || iconSizes.md, "shrink-0")} />}
      <span>{showTier ? config.label : config.badgeLabel}</span>
    </span>
  );
}
