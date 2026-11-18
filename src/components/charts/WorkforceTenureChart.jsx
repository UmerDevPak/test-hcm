"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const TENURE_COLORS = ["#06b6d4", "#6366f1", "#10b981", "#a855f7"];

function CustomTenureTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md p-3 shadow-2xl text-xs space-y-1 z-50">
      <div className="font-semibold text-zinc-100">{row.bracket}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-zinc-400">Employees</span>
        <span className="font-mono font-bold text-zinc-100">
          {row.count} ({row.share}%)
        </span>
      </div>
    </div>
  );
}

export function WorkforceTenureChart({
  tenureStats = {},
  totalEmployees = 0,
  height = 220,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const total =
    totalEmployees ||
    Number(tenureStats.under1Year || 0) +
      Number(tenureStats.oneToThreeYears || 0) +
      Number(tenureStats.threeToFiveYears || 0) +
      Number(tenureStats.overFiveYears || 0) ||
    1;

  const data = [
    {
      bracket: "< 1 Year",
      count: Number(tenureStats.under1Year || 0),
      share: Math.round((Number(tenureStats.under1Year || 0) / total) * 100),
    },
    {
      bracket: "1 – 3 Yrs",
      count: Number(tenureStats.oneToThreeYears || 0),
      share: Math.round((Number(tenureStats.oneToThreeYears || 0) / total) * 100),
    },
    {
      bracket: "3 – 5 Yrs",
      count: Number(tenureStats.threeToFiveYears || 0),
      share: Math.round((Number(tenureStats.threeToFiveYears || 0) / total) * 100),
    },
    {
      bracket: "5+ Years",
      count: Number(tenureStats.overFiveYears || 0),
      share: Math.round((Number(tenureStats.overFiveYears || 0) / total) * 100),
    },
  ];

  if (!mounted) {
    return (
      <div
        className="w-full flex items-center justify-center text-xs text-zinc-500"
        style={{ height }}
      >
        Loading workforce tenure telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="bracket"
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
            <Tooltip content={<CustomTenureTooltip />} />
            <Bar dataKey="count" name="Staff Count" radius={[6, 6, 0, 0]} maxBarSize={44}>
              {data.map((entry, idx) => (
                <Cell key={entry.bracket} fill={TENURE_COLORS[idx % TENURE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {data.map((item, idx) => (
          <div
            key={item.bracket}
            className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: TENURE_COLORS[idx % TENURE_COLORS.length] }}
              />
              <span>{item.bracket}</span>
            </div>
            <div className="mt-1 font-mono font-bold text-zinc-100">
              {item.count}{" "}
              <span className="text-[11px] font-normal text-zinc-500">({item.share}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
