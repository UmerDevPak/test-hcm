"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PALETTE = ["#6366f1", "#10b981", "#06b6d4", "#f59e0b", "#a855f7", "#ec4899"];

function CustomWorkforceTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md p-3 shadow-2xl text-xs space-y-1.5 z-50">
      <div className="font-semibold text-zinc-100 border-b border-zinc-800 pb-1">
        {row.name || "Department"}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">Headcount</span>
        <span className="font-mono font-bold text-zinc-100">{row.headcount ?? 0}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">Monthly Payroll</span>
        <span className="font-mono font-semibold text-emerald-400">
          {formatCurrency(row.totalSalary || 0)}
        </span>
      </div>
    </div>
  );
}

export function WorkforceDistributionChart({
  departmentStats = [],
  totalHeadcount = 0,
  height = 230,
}) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState("bar");

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData =
    departmentStats.length > 0
      ? departmentStats
      : [{ name: "General", headcount: totalHeadcount || 1, totalSalary: 0 }];

  if (!mounted) {
    return (
      <div
        className="w-full flex items-center justify-center text-xs text-zinc-500"
        style={{ height }}
      >
        Loading workforce distribution...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-400">
          Total Tracked Personnel:{" "}
          <strong className="text-zinc-200 font-mono">{totalHeadcount}</strong>
        </span>
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setViewMode("bar")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
              viewMode === "bar"
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <BarChart3 className="w-3 h-3" /> Bar
          </button>
          <button
            type="button"
            onClick={() => setViewMode("donut")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
              viewMode === "donut"
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <PieChartIcon className="w-3 h-3" /> Donut
          </button>
        </div>
      </div>

      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          {viewMode === "bar" ? (
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={{ stroke: "#27272a" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomWorkforceTooltip />} />
              <Bar dataKey="headcount" name="Headcount" radius={[6, 6, 0, 0]} maxBarSize={42}>
                {chartData.map((entry, idx) => (
                  <Cell key={entry.name || idx} fill={PALETTE[idx % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                dataKey="headcount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={88}
                paddingAngle={3}
                stroke="none"
              >
                {chartData.map((entry, idx) => (
                  <Cell key={entry.name || idx} fill={PALETTE[idx % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomWorkforceTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
