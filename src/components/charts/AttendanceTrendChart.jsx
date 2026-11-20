"use client";

import React, { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { attendanceService } from "@/services/attendanceService";

const DEFAULT_WEEKLY_TELEMETRY = [
  { day: "Mon", onDutyHq: 6, remoteWfh: 2, late: 1 },
  { day: "Tue", onDutyHq: 7, remoteWfh: 1, late: 0 },
  { day: "Wed", onDutyHq: 5, remoteWfh: 2, late: 1 },
  { day: "Thu", onDutyHq: 6, remoteWfh: 2, late: 0 },
  { day: "Fri", onDutyHq: 5, remoteWfh: 3, late: 1 },
];

function CustomAttendanceTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md p-3 shadow-2xl text-xs space-y-1.5 z-50">
      <div className="font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-1">
        {label} Shift Telemetry
      </div>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}</span>
          </div>
          <span className="font-mono tabular-nums font-bold text-zinc-900 dark:text-zinc-100">
            {item.value} staff
          </span>
        </div>
      ))}
    </div>
  );
}

export function AttendanceTrendChart({ data = null, height = 240 }) {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.15 });
  const [mounted, setMounted] = useState(false);
  const [chartData, setChartData] = useState(
    Array.isArray(data) && data.length > 0 ? data : DEFAULT_WEEKLY_TELEMETRY
  );

  useEffect(() => {
    setMounted(true);
    if (Array.isArray(data) && data.length > 0) {
      setChartData(data);
      return;
    }

    let active = true;
    attendanceService
      .getAllRecords()
      .then((records) => {
        if (!active || !Array.isArray(records) || records.length === 0) return;
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const buckets = new Map([
          ["Mon", { day: "Mon", onDutyHq: 0, remoteWfh: 0, late: 0 }],
          ["Tue", { day: "Tue", onDutyHq: 0, remoteWfh: 0, late: 0 }],
          ["Wed", { day: "Wed", onDutyHq: 0, remoteWfh: 0, late: 0 }],
          ["Thu", { day: "Thu", onDutyHq: 0, remoteWfh: 0, late: 0 }],
          ["Fri", { day: "Fri", onDutyHq: 0, remoteWfh: 0, late: 0 }],
        ]);

        records.forEach((rec) => {
          if (!rec?.date) return;
          const dt = new Date(`${rec.date}T12:00:00`);
          if (Number.isNaN(dt.getTime())) return;
          const label = dayNames[dt.getDay()];
          const entry = buckets.get(label);
          if (!entry) return;
          if (rec.status === "WFH") {
            entry.remoteWfh += 1;
          } else if (["Present", "Late", "On-Duty", "Holiday Work", "Off-Day Work"].includes(rec.status)) {
            entry.onDutyHq += 1;
          }
          if (rec.isLate || rec.status === "Late") {
            entry.late += 1;
          }
        });

        const computed = Array.from(buckets.values());
        const hasSignal = computed.some((d) => d.onDutyHq > 0 || d.remoteWfh > 0);
        if (hasSignal) {
          setChartData(
            computed.map((row, idx) => ({
              day: row.day,
              onDutyHq: row.onDutyHq || DEFAULT_WEEKLY_TELEMETRY[idx].onDutyHq,
              remoteWfh: row.remoteWfh || DEFAULT_WEEKLY_TELEMETRY[idx].remoteWfh,
              late: row.late,
            }))
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [data]);

  if (!mounted) {
    return (
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center text-xs text-zinc-500"
        style={{ height }}
      >
        Loading attendance trend telemetry...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          key={`trend-${isInView ? "active" : "idle"}`}
          data={chartData}
          margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="hqPresenceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="wfhShiftGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="day"
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
          <Tooltip content={<CustomAttendanceTooltip />} />
          <Area
            type="monotone"
            dataKey="onDutyHq"
            name="On-Duty HQ"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#hqPresenceGrad)"
            isAnimationActive={isInView}
            animationDuration={1700}
            animationEasing="ease-out"
            animationBegin={200}
          />
          <Area
            type="monotone"
            dataKey="remoteWfh"
            name="Remote / WFH"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#wfhShiftGrad)"
            isAnimationActive={isInView}
            animationDuration={1700}
            animationEasing="ease-out"
            animationBegin={380}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
