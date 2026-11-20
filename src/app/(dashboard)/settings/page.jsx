"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizeRole } from "@/lib/constants";
import {
  Settings,
  Cpu,
  Users,
  ShieldCheck,
  Clock,
  Zap,
  AlertTriangle,
  Calendar,
  CalendarDays,
  DollarSign,
  Building2,
  RefreshCw,
  CheckCircle2,
  Lock,
  History,
  PlayCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { isLiveFirebaseConfigured } from "@/lib/firebase/client";
import { hcmConfigService } from "@/services/hcmConfigService";
import { setupService } from "@/services/setupService";
import { auditService, formatRelativeTimestamp } from "@/services/auditService";
import { attendanceService } from "@/services/attendanceService";
import { reportService } from "@/services/reportService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { DevicesSetupTab, EmployeesOnDeviceTab } from "@/components/setup/DevicesAndUsersTab";
import {
  AttendanceRuleTab,
  LatePolicyTab,
  OvertimePolicyTab,
  OffHalfDayTab,
} from "@/components/setup/PoliciesAndRulesTab";
import { ShiftsTab, PublicHolidaysTab } from "@/components/setup/ShiftsAndHolidaysTab";
import { LeavePolicyTab, SalarySetupTab } from "@/components/setup/LeaveAndSalaryTab";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  const [activeTab, setActiveTab] = useState("TAB_03");
  const [config, setConfig] = useState(() => hcmConfigService.peekCachedConfig());
  const [auditLogs, setAuditLogs] = useState([]);
  const [reprocessing, setReprocessing] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const [companyName, setCompanyName] = useState("HCM Lite Technologies, Inc.");
  const [ein, setEin] = useState("94-3829102");
  const [currency, setCurrency] = useState("USD ($)");
  const [address, setAddress] = useState("100 Market St, Suite 400, San Francisco, CA 94105");

  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      const userRole = normalizeRole(user.role);
      router.replace(userRole === "HR" ? "/hr" : "/employee");
    }
  }, [user, isAdmin, authLoading, router]);

  const loadAll = async () => {
    const [cfg, profile, logs] = await Promise.all([
      hcmConfigService.getConfig(true),
      setupService.getCompanyProfile(),
      auditService.getAuditLogs(20, true),
    ]);
    setConfig(cfg);
    setAuditLogs(logs);
    if (profile) {
      setCompanyName(profile.companyName || "HCM Lite Technologies, Inc.");
      setEin(profile.ein || "94-3829102");
      setCurrency(profile.currency || "USD ($)");
      setAddress(profile.address || "100 Market St, Suite 400, San Francisco, CA 94105");
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAll();
    }
  }, [isAdmin]);

  if (!authLoading && (!user || !isAdmin)) {
    return null;
  }

  const actorName = user?.displayName || "Sarah Connor";

  const handleConfigUpdated = async (nextConfig) => {
    setConfig(nextConfig);
    reportService.invalidateCache();
    const logs = await auditService.getAuditLogs(20, true);
    setAuditLogs(logs);
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      await setupService.saveCompanyProfile(
        { companyName, legalEntity: companyName, ein, currency, address },
        actorName
      );
      const logs = await auditService.getAuditLogs(20, true);
      setAuditLogs(logs);
      notifySuccess("Legal Entity Updated", "Company profile saved to Firestore & local cache.");
    } catch (err) {
      notifyError("Save Failed", err.message);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleReprocessAttendance = async () => {
    setReprocessing(true);
    try {
      const res = await attendanceService.reprocessAttendance({ actor: actorName });
      reportService.invalidateCache();
      const logs = await auditService.getAuditLogs(20, true);
      setAuditLogs(logs);
      notifySuccess(
        "Attendance Re-processed",
        `Re-evaluated ${res.updatedCount} unlocked attendance records against current Shifts, Late, OT & Holiday rules.`
      );
    } catch (err) {
      notifyError("Re-processing Failed", err.message);
    } finally {
      setReprocessing(false);
    }
  };

  const handleResetData = () => {
    localStorage.clear();
    hcmConfigService.invalidateCache();
    reportService.invalidateCache();
    setConfirmReset(false);
    notifyInfo("Demo State Reset", "Factory seed configuration restored. Reloading...");
    setTimeout(() => window.location.reload(), 500);
  };

  const setupTabs = [
    { id: "TAB_01", label: "01 Devices", icon: Cpu, count: config?.devices?.length || 0 },
    { id: "TAB_02", label: "02 Device Users", icon: Users, count: config?.deviceUsers?.length || 0 },
    { id: "TAB_03", label: "03 Attendance Rule", icon: ShieldCheck },
    { id: "TAB_04", label: "04 Late Policy", icon: Clock },
    { id: "TAB_05", label: "05 Overtime", icon: Zap },
    { id: "TAB_06", label: "06 Shifts", icon: Clock, count: config?.shifts?.length || 0 },
    { id: "TAB_07", label: "07 OFF / Half Day", icon: AlertTriangle },
    { id: "TAB_08", label: "08 Holidays", icon: Calendar, count: config?.holidays?.length || 0 },
    { id: "TAB_09", label: "09 Leave Policy", icon: CalendarDays },
    { id: "TAB_10", label: "10 Salary Setup", icon: DollarSign },
    { id: "OVERVIEW", label: "Company & Audit", icon: Building2 },
  ];

  const rbacMatrix = [
    {
      module: "10-Tab HCM Setup & Policies",
      admin: "Full Configuration & Re-process",
      hr: "Device Sync, Mapping & Re-process",
      emp: "Read-Only Active Rules",
    },
    {
      module: "Time, Attendance & Corrections",
      admin: "Full Org Oversight & Lock",
      hr: "Approve Corrections / WFH / OT",
      emp: "Web Punch & Submit Corrections",
    },
    {
      module: "Leave & Holiday Calendar",
      admin: "Policy Quotas & Final Sign-off",
      hr: "Approve & Manual Audit Adjust",
      emp: "12 Leave Types + Live Preview",
    },
    {
      module: "Payroll Engine (Tab 10)",
      admin: "Finalize & Permanently Lock",
      hr: "Prepare Monthly Drafts",
      emp: "Finalized Payslips Only",
    },
    {
      module: "Compliance Audit Trail",
      admin: "Full Immutable History",
      hr: "Operational History",
      emp: "Self Request Status",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              10-Tab HCM Setup & Enterprise Control
            </h1>
            <Badge variant="info" size="sm">
              Policy v{config?.version || 1}
            </Badge>
            {config?.attendanceRule?.attendanceLockedUpTo && (
              <Badge variant="warning" size="sm" dot>
                Locked ≤ {config.attendanceRule.attendanceLockedUpTo}
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Dynamic configuration engine governing biometric terminals, shifts, late/overtime rules, holidays, 12 leave types, and Tab 10 payroll formulas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={PlayCircle}
            isLoading={reprocessing}
            onClick={handleReprocessAttendance}
          >
            Re-process Attendance
          </Button>
          {!confirmReset ? (
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={() => setConfirmReset(true)}
            >
              Reset Demo Data
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-500/30 rounded-lg px-2.5 py-1">
              <span className="text-[11px] text-rose-300 font-medium">Reset factory data?</span>
              <Button size="sm" variant="danger" onClick={handleResetData}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 10-Tab Navigation Bar + Company & Audit Tab */}
      <Tabs tabs={setupTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Active Tab Content */}
      <div>
        {activeTab === "TAB_01" && (
          <DevicesSetupTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}
        {activeTab === "TAB_02" && (
          <EmployeesOnDeviceTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}
        {activeTab === "TAB_03" && (
          <AttendanceRuleTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}
        {activeTab === "TAB_04" && (
          <LatePolicyTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}
        {activeTab === "TAB_05" && (
          <OvertimePolicyTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}
        {activeTab === "TAB_06" && (
          <ShiftsTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}
        {activeTab === "TAB_07" && (
          <OffHalfDayTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}
        {activeTab === "TAB_08" && (
          <PublicHolidaysTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}
        {activeTab === "TAB_09" && (
          <LeavePolicyTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}
        {activeTab === "TAB_10" && (
          <SalarySetupTab config={config} onConfigUpdated={handleConfigUpdated} actorName={actorName} />
        )}

        {activeTab === "OVERVIEW" && (
          <div className="space-y-6">
            {/* Grid: Company Profile & Firebase Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    Organization & Legal Entity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveCompany} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Legal Entity Name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                      <Input
                        label="Employer Identification Number (EIN)"
                        value={ein}
                        onChange={(e) => setEin(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Primary Headquarters Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                      />
                      <Input
                        label="Default Operational Currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" size="sm" isLoading={savingCompany}>
                        Save Entity Details
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database & Policy Engine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                      <span className="text-zinc-400">Database Engine</span>
                      <span className="font-semibold text-zinc-200">Cloud Firestore</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                      <span className="text-zinc-400">Config Document</span>
                      <span className="font-mono text-zinc-200">hcm_config/master</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                      <span className="text-zinc-400">Policy Hierarchy</span>
                      <span className="font-semibold text-indigo-300">Employee &gt; Dept &gt; Co</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                      <span className="text-zinc-400">Payroll Lock Date</span>
                      <span className="font-mono text-amber-400">
                        {config?.attendanceRule?.attendanceLockedUpTo || "Unlocked"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-zinc-400">Operational Mode</span>
                      <Badge variant={isLiveFirebaseConfigured ? "success" : "info"} dot>
                        {isLiveFirebaseConfigured ? "Live Firebase Connected" : "Local Demo Fallback"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RBAC Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Role-Based Access Control (RBAC) Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Functional Module</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>HR</TableHead>
                        <TableHead>Employee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rbacMatrix.map((item) => (
                        <TableRow key={item.module}>
                          <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.module}
                          </TableCell>
                          <TableCell className="text-indigo-600 dark:text-indigo-400 font-medium">{item.admin}</TableCell>
                          <TableCell className="text-emerald-600 dark:text-emerald-400">{item.hr}</TableCell>
                          <TableCell className="text-zinc-600 dark:text-zinc-400">{item.emp}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Policy Audit History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    Recent Setup & Policy Change Audit Log
                  </CardTitle>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Every setup modification, payroll lock, balance adjustment, and device sync is permanently recorded.
                  </p>
                </div>
                <Badge variant="info" size="sm">Immutable</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Actor</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Action & Target</TableHead>
                        <TableHead>Delta</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.slice(0, 12).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                            {log.actor}{" "}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                              {log.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="neutral" size="sm">{log.module || "System"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-semibold text-zinc-800 dark:text-zinc-200">{log.action}</div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-xs">{log.target}</div>
                          </TableCell>
                          <TableCell className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                            {log.oldValue || log.newValue
                              ? `${log.oldValue || "—"} → ${log.newValue || "—"}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-zinc-500 dark:text-zinc-400">
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
        )}
      </div>
    </div>
  );
}
