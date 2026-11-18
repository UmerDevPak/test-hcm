"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  History,
} from "lucide-react";
import { reportService } from "@/services/reportService";
import { employeeService } from "@/services/employeeService";
import { auditService, formatRelativeTimestamp } from "@/services/auditService";
import { useNotification } from "@/context/NotificationContext";
import { formatCurrency, exportToCSV } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";

export default function ReportsPage() {
  const { notifySuccess } = useNotification();
  const [metrics, setMetrics] = useState(() => reportService.peekCachedMetrics("executive"));
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    Promise.all([
      reportService.getExecutiveDashboardMetrics(true),
      auditService.getAuditLogs(12, true),
    ]).then(([m, logs]) => {
      setMetrics(m);
      setAuditLogs(logs);
    });
  }, []);

  const handleExportFullAudit = async () => {
    const employees = await employeeService.getAllEmployees();
    exportToCSV(`enterprise-hr-audit-${new Date().toISOString().split("T")[0]}`, employees, {
      id: "Employee ID",
      name: "Full Name",
      email: "Email Address",
      department: "Department",
      jobTitle: "Title",
      role: "System Role",
      annualSalary: "Salary ($)",
      hireDate: "Hire Date",
      status: "Status",
      deviceUserId: "Biometric Device ID",
      assignedShiftId: "Assigned Shift ID",
    });
    notifySuccess("Audit File Generated", "Comprehensive HR directory & rule audit report downloaded.");
  };

  const handleExportAuditLog = () => {
    exportToCSV(`hcm-policy-audit-log-${new Date().toISOString().split("T")[0]}`, auditLogs, {
      id: "Audit ID",
      actor: "Actor",
      role: "Role",
      module: "Module",
      action: "Action",
      target: "Target",
      oldValue: "Previous",
      newValue: "Updated",
      timestamp: "Timestamp",
    });
    notifySuccess("Audit Trail Exported", "System change history CSV downloaded.");
  };

  const budgetRows = metrics?.departmentBudgetBreakdown || [];
  const topDept = budgetRows[0]?.department || "Engineering";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Reports & Executive Analytics
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Live workforce metrics, department budget allocations, attrition ratios, and immutable audit extracts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" icon={History} onClick={handleExportAuditLog}>
            Export Audit Trail
          </Button>
          <Button size="sm" icon={Download} onClick={handleExportFullAudit}>
            Export Enterprise Audit
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Workforce Size"
          value={metrics?.headcount?.total ?? 0}
          change={`${metrics?.headcount?.active ?? 0} Active`}
          isPositive={true}
          subtext="Live directory headcount"
          icon={Users}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/10"
        />

        <StatCard
          title="Average Compensation"
          value={formatCurrency(metrics?.headcount?.averageSalary ?? 0)}
          subtext="Annual mean salary across staff"
          icon={DollarSign}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />

        <StatCard
          title="Attrition Rate"
          value={`${metrics?.headcount?.attritionRate ?? 0}%`}
          isPositive={true}
          change={`${metrics?.headcount?.terminated ?? 0} Leavers`}
          subtext="Computed from employee statuses"
          icon={TrendingUp}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
        />

        <StatCard
          title="Attendance Reliability"
          value={`${metrics?.attendance?.presentRate ?? 0}%`}
          subtext="Across office, WFH & on-duty teams"
          icon={Calendar}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Department Distribution & Budget Allocation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Headcount Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(metrics?.departmentDistribution || {}).map(([dept, count]) => {
              const total = metrics?.headcount?.total || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={dept} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300">{dept}</span>
                    <span className="text-zinc-400">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Monthly Budget & Payroll Spend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2.5 text-xs">
              {budgetRows.map((row, idx) => (
                <div
                  key={row.department}
                  className={`flex justify-between py-2 ${
                    idx < budgetRows.length - 1 ? "border-b border-zinc-800" : ""
                  }`}
                >
                  <span className="text-zinc-400">{row.department}</span>
                  <span className="font-mono font-medium text-zinc-200">
                    {row.percentage}% ({formatCurrency(row.monthlyCost)} / mo)
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-800 text-xs text-zinc-400">
              <strong>Live Executive Insight:</strong> {topDept} carries the highest monthly payroll allocation out of {formatCurrency(metrics?.payroll?.totalMonthlyBudget || 0)} total monthly run-rate across {metrics?.payroll?.runsCount || 0} recorded batch(es).
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Audit Trail Extract */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Compliance & Policy Audit Extract
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-0.5">
              Recent setup changes, attendance re-processing, manual balance adjustments, and payroll locks.
            </p>
          </div>
          <Badge variant="info" size="sm">Live Feed</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action & Target</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-medium text-zinc-100">
                      {log.actor}{" "}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {log.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" size="sm">{log.module || "System"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-semibold text-zinc-200">{log.action}</div>
                      <div className="text-[11px] text-zinc-400 font-mono truncate max-w-xs">{log.target}</div>
                    </TableCell>
                    <TableCell className="text-[11px] font-mono text-zinc-400">
                      {log.oldValue || log.newValue
                        ? `${log.oldValue || "—"} → ${log.newValue || "—"}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-zinc-400">
                      {formatRelativeTimestamp(log.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
