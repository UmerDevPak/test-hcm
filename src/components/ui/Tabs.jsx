"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Tabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className="w-full">
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-zinc-100/90 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm w-full",
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 select-none whitespace-nowrap",
                isActive
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm border border-zinc-200/90 dark:border-zinc-700/80 ring-1 ring-black/5 dark:ring-white/5"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/60"
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-colors",
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-zinc-400 dark:text-zinc-500"
                  )}
                />
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0 transition-colors",
                    isActive
                      ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30"
                      : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
