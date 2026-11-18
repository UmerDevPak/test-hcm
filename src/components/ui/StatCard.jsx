"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  subtext,
  change,
  changeType,
  isPositive,
  icon: Icon,
  iconColor = "text-indigo-500",
  iconBg = "bg-indigo-500/10",
  className = "",
  ...props
}) {
  let variant = "neutral";
  if (changeType === "positive" || isPositive === true) {
    variant = "positive";
  } else if (changeType === "negative" || isPositive === false) {
    variant = "negative";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/75 p-5 transition-colors duration-150 hover:border-indigo-500/30 dark:hover:border-indigo-500/40 group flex flex-col justify-between h-full min-h-[136px] relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </span>
          {Icon && (
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("w-4 h-4", iconColor)} />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2 flex-wrap">
          <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-zinc-900 dark:text-zinc-50">
            {value}
          </span>
          {change && (
            <span
              className={cn(
                "inline-flex items-center text-[11px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap",
                variant === "positive" &&
                  "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 border border-emerald-500/20",
                variant === "negative" &&
                  "text-rose-600 bg-rose-500/10 dark:text-rose-400 border border-rose-500/20",
                variant === "neutral" &&
                  "text-zinc-600 bg-zinc-100 dark:bg-zinc-800/80 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80"
              )}
            >
              {variant === "positive" && <TrendingUp className="w-3 h-3 mr-1 inline" />}
              {variant === "negative" && <TrendingDown className="w-3 h-3 mr-1 inline" />}
              {variant === "neutral" && <Minus className="w-3 h-3 mr-1 inline opacity-60" />}
              {change}
            </span>
          )}
        </div>
      </div>

      {subtext && (
        <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/60 pt-2">
          {subtext}
        </p>
      )}
    </motion.div>
  );
}
