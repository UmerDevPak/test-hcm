"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  CreditCard,
  CheckCircle2,
  Plus,
  ArrowRight,
  Check,
  X,
  UserCheck,
  Trash2,
  Cpu,
  RefreshCw,
  Link2,
  AlertTriangle,
  PlayCircle,
  Bell,
  Award,
  TrendingUp,
  Sparkles,
  Crown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { reportService } from "@/services/reportService";
import { leaveService } from "@/services/leaveService";
import { correctionService } from "@/services/correctionService";
import { hcmConfigService } from "@/services/hcmConfigService";
import { attendanceService } from "@/services/attendanceService";
import { employeeService } from "@/services/employeeService";
import { performanceService } from "@/services/performanceService";
import { auditService } from "@/services/auditService";
import { activityNotificationService } from "@/services/activityNotificationService";
import { formatDate } from "@/lib/utils";
import { containerStagger, itemFadeUp, scrollViewport } from "@/lib/animationVariants";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmployeeModal } from "@/components/employees/EmployeeModal";
import { AttendanceTrendChart } from "@/components/charts/AttendanceTrendChart";
import { RankBadge } from "@/components/performance/RankBadge";
import { PromotionRecommendationModal } from "@/components/performance/PromotionRecommendationModal";

export default function HrDashboardPage() {
  const router = useRouter();
  const { user, isHR, loading: authLoading } = useAuth();
  const { notifySuccess, notifyInfo, notifyError } = useNotification();
  const cachedHr = reportService.peekCachedMetrics("hr");
  const [metrics, setMetrics] = useState(cachedHr);
  const [loading, setLoading] = useState(!cachedHr);
  const [pendingItems, setPendingItems] = useState(() => {
    if (!cachedHr) return [];
    return [
      ...(cachedHr.pendingLeaves || []).map((l) => ({
        id: l.id,
        sourceType: "LEAVE",
        employeeId: l.employeeId,
        employeeName: l.employeeName,
        category: `${l.leaveType} Leave`,
        details: `${l.startDate} to ${l.endDate} (${l.daysCount} days)`,
        reason: l.reason,
        appliedAt: l.appliedAt,
      })),
      ...(cachedHr.attendanceCorrections || []).map((c) => ({
        id: c.id,
        sourceType: "CORRECTION",
        employeeId: c.employeeId,
        employeeName: c.employeeName,
        category: c.requestType,
        details: `${c.date} • ${c.requestedTime}${c.requestedClockOut ? ` - ${c.requestedClockOut}` : ""}`,
        reason: c.reason,
        appliedAt: c.appliedAt,
      })),
    ];
  });
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [syncingDevices, setSyncingDevices] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [mappingUser, setMappingUser] = useState(null);
  const [employeesList, setEmployeesList] = useState([]);
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [rankingStats, setRankingStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !isHR) {
      router.replace("/employee");
    }
  }, [user, isHR, authLoading, router]);

  const loadData = async (force = false) => {
    if (!isHR) return;
    try {
      const [data, emps, rankStats, recs] = await Promise.all([
        reportService.getHrDashboardMetrics(force),
        employeeService.getAllEmployees(),
        performanceService.getRankingStats(),
        performanceService.getPromotionRecommendations({}, force),
      ]);
      setMetrics(data);
      setEmployeesList(emps);
      setRankingStats(rankStats);
      setRecommendations(recs);
      const combined = [
        ...(data.pendingLeaves || []).map((l) => ({
          id: l.id,
          sourceType: "LEAVE",
          employeeId: l.employeeId,
          employeeName: l.employeeName,
          category: `${l.leaveType} Leave`,
          details: `${l.startDate} to ${l.endDate} (${l.daysCount} days)`,
          reason: l.reason,
          appliedAt: l.appliedAt,
        })),
        ...(data.attendanceCorrections || []).map((c) => ({
          id: c.id,
          sourceType: "CORRECTION",
          employeeId: c.employeeId,
          employeeName: c.employeeName,
          category: c.requestType,
          details: `${c.date} • ${c.requestedTime}${c.requestedClockOut ? ` - ${c.requestedClockOut}` : ""}`,
          reason: c.reason,
          appliedAt: c.appliedAt,
        })),
      ];
      setPendingItems(combined);
    } catch (err) {
      console.warn("[HrDashboard] Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isHR]);

  useEffect(() => {
    const handleConfigChange = () => {
      loadData(true);
    };
    window.addEventListener("hcm_config_updated", handleConfigChange);
    window.addEventListener("hcm_promotion_updated", handleConfigChange);
    return () => {
      window.removeEventListener("hcm_config_updated", handleConfigChange);
      window.removeEventListener("hcm_promotion_updated", handleConfigChange);
    };
  }, []);

  const actorName = user?.displayName || "Aaliyah Patel";

  const handleApprove = async (item) => {
    try {
      if (item.sourceType === "LEAVE") {
        await leaveService.updateRequestStatus(item.id, "Approved", actorName);
        notifySuccess("Leave Approved", `Approved request for ${item.employeeName}. Days deducted.`);
      } else {
        await correctionService.reviewCorrection(item.id, "Approved", actorName);
        notifySuccess("Correction Approved", `Applied ${item.category} directly to ${item.employeeName}'s attendance ledger.`);
      }
      setPendingItems((prev) => prev.filter((p) => p.id !== item.id));
      reportService.invalidateCache("hr");
      loadData(true);
    } catch (err) {
      notifyError("Action Failed", err.message);
    }
  };

  const handleReject = async (item) => {
    try {
      if (item.sourceType === "LEAVE") {
        await leaveService.updateRequestStatus(item.id, "Rejected", actorName);
        notifyInfo("Leave Rejected", `Leave request for ${item.employeeName} was marked rejected.`);
      } else {
        await correctionService.reviewCorrection(item.id, "Rejected", actorName);
        notifyInfo("Correction Rejected", `${item.category} for ${item.employeeName} was rejected.`);
      }
      setPendingItems((prev) => prev.filter((p) => p.id !== item.id));
      reportService.invalidateCache("hr");
      loadData(true);
    } catch (err) {
      notifyError("Action Failed", err.message);
    }
  };

  const handleDeleteInboxItem = async (item) => {
    try {
      if (item.sourceType === "LEAVE") {
        await leaveService.deleteRequest(item.id);
      } else {
        await correctionService.deleteCorrection(item.id);
      }
      setPendingItems((prev) => prev.filter((p) => p.id !== item.id));
      reportService.invalidateCache("hr");
      notifySuccess("Item Removed", `Pending ${item.category} request removed.`);
      loadData(true);
    } catch (err) {
      notifyError("Removal Failed", err.message);
    }
  };

  const handlePullAllLogs = async () => {
    const devices = metrics?.deviceSummary?.devices || [];
    if (devices.length === 0) return;
    setSyncingDevices(true);
    try {
      let pulledTotal = 0;
      for (const dev of devices) {
        if (dev.enabled) {
          await hcmConfigService.runDeviceAction(dev.id, "pull_logs", actorName);
          pulledTotal++;
        }
      }
      reportService.invalidateCache("hr");
      await loadData(true);
      notifySuccess("Biometric Sync Complete", `Pulled punch logs across ${pulledTotal} active biometric terminals.`);
    } catch (err) {
      notifyError("Device Pull Failed", err.message);
    } finally {
      setSyncingDevices(false);
    }
  };

  const handleReprocessAttendance = async () => {
    setReprocessing(true);
    try {
      const res = await attendanceService.reprocessAttendance({ actor: actorName });
      reportService.invalidateCache();
      await loadData(true);
      notifySuccess("Attendance Re-processed", `Re-evaluated ${res.updatedCount} attendance logs under active Shift/Late/OT rules.`);
    } catch (err) {
      notifyError("Re-process Failed", err.message);
    } finally {
      setReprocessing(false);
    }
  };

  const handleConfirmMapDeviceUser = async (e) => {
    e.preventDefault();
    if (!mappingUser || !targetEmployeeId) return;
    try {
      await hcmConfigService.mapDeviceUserToEmployee({
        deviceUserId: mappingUser.deviceUserId,
        employeeId: targetEmployeeId,
        actor: actorName,
      });
      setMappingUser(null);
      reportService.invalidateCache("hr");
      await loadData(true);
      notifySuccess("Biometric User Linked", `Device ID #${mappingUser.deviceUserId} mapped to ${targetEmployeeId}.`);
    } catch (err) {
      notifyError("Mapping Failed", err.message);
    }
  };

  const handleSendLateWarning = async (emp) => {
    await auditService.logAudit({
      actor: actorName,
      role: "HR",
      module: "Late Policy Watchlist",
      action: "Issued Habitual Lateness Warning",
      target: `${emp.name} (${emp.id}) — ${emp.lateCount}x late check-ins`,
      status: "warning",
    });
    activityNotificationService.addNotification({
      title: "Attendance Punctuality Notice",
      message: `${actorName} logged a punctuality advisory for ${emp.name} (${emp.lateCount}x late arrivals this month).`,
      actor: { name: actorName, role: "HR" },
      actorRole: "HR",
      targetAudience: "ALL",
      type: "attendance",
      link: "/attendance",
    });
    notifyInfo("Warning Logged", `Logged punctuality notice for ${emp.name} and added to Audit Trail.`);
  };

  if (!authLoading && (!user || !isHR)) {
    return null;
  }

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const {
    totalEmployees = 8,
    presentToday = 6,
    lateToday = 2,
    onLeaveToday = 1,
    lateWatchlist = [],
    departmentAttendance = [],
    deviceSummary = {},
    graceMinutes = 15,
    shiftStart = "09:00",
    attendanceLockedUpTo = "",
  } = metrics || {};

  // Compute dynamic grace cutoff string (e.g. 09:00 + 15m -> 09:15)
  const [shH, shM] = (shiftStart || "09:00").split(":").map(Number);
  const cutoffTotal = (shH || 9) * 60 + (shM || 0) + Number(graceMinutes || 15);
  const cutoffLabel = `${String(Math.floor(cutoffTotal / 60) % 24).padStart(2, "0")}:${String(cutoffTotal % 60).padStart(2, "0")}`;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerStagger}
      className="space-y-6"
    >
      {/* 1. Header */}
      <motion.div
        variants={itemFadeUp}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-emerald-950/30 border border-zinc-800 shadow-elevated"
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-glow shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-50">
              People Operations Dashboard
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              {formatDate(new Date().toISOString())}
            </span>
            {attendanceLockedUpTo && (
              <Badge variant="warning" size="sm">Locked ≤ {attendanceLockedUpTo}</Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            Manage daily biometric terminal sync, approve leave & attendance corrections, monitor lateness, and prepare monthly payroll drafts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={PlayCircle}
            isLoading={reprocessing}
            onClick={handleReprocessAttendance}
          >
            Re-process Attendance
          </Button>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setIsEmployeeModalOpen(true)}
          >
            Add Employee
          </Button>
          <Link href="/payroll">
            <Button variant="secondary" size="sm" icon={CreditCard}>
              Prepare Payroll Draft
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* 2. Daily Snapshot Cards */}
      <motion.div
        variants={containerStagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5"
      >
        <motion.div
          variants={itemFadeUp}
          whileHover={{ y: -4, transition: { duration: 0.16 } }}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-4 flex flex-col justify-between h-full min-h-[120px] transition-colors hover:border-zinc-700/80 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2 min-h-[28px]">
            <span className="text-xs font-medium text-zinc-400">Total Workforce</span>
            <Users className="w-4 h-4 text-zinc-400 shrink-0" />
          </div>
          <div className="mt-auto pt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
              {totalEmployees}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 truncate">
              Across {departmentAttendance.length || 5} departments
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemFadeUp}
          whileHover={{ y: -4, transition: { duration: 0.16 } }}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-4 flex flex-col justify-between h-full min-h-[120px] transition-colors hover:border-emerald-500/30 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2 min-h-[28px]">
            <span className="text-xs font-medium text-zinc-400">Present Today</span>
            <Badge variant="success" dot size="sm" className="shrink-0">
              Active
            </Badge>
          </div>
          <div className="mt-auto pt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
              {presentToday}
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-1 flex items-center gap-1 truncate">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>{Math.round((presentToday / (totalEmployees || 1)) * 100)}% attendance</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemFadeUp}
          whileHover={{ y: -4, transition: { duration: 0.16 } }}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-4 flex flex-col justify-between h-full min-h-[120px] transition-colors hover:border-amber-500/30 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2 min-h-[28px]">
            <span className="text-xs font-medium text-zinc-400">Late Today</span>
            <Badge variant="warning" dot size="sm" className="shrink-0">
              &gt; {cutoffLabel}
            </Badge>
          </div>
          <div className="mt-auto pt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-amber-400">
              {lateToday}
            </div>
            <div className="text-[11px] text-amber-500/80 mt-1 truncate">
              Grace {graceMinutes}m elapsed
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemFadeUp}
          whileHover={{ y: -4, transition: { duration: 0.16 } }}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-4 flex flex-col justify-between h-full min-h-[120px] transition-colors hover:border-indigo-500/30 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2 min-h-[28px]">
            <span className="text-xs font-medium text-zinc-400">On Leave Today</span>
            <Badge variant="info" dot size="sm" className="shrink-0">
              Approved
            </Badge>
          </div>
          <div className="mt-auto pt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-indigo-400">
              {onLeaveToday}
            </div>
            <div className="text-[11px] text-indigo-400/80 mt-1 truncate">Scheduled absence</div>
          </div>
        </motion.div>

        <motion.div
          variants={itemFadeUp}
          whileHover={{ y: -4, transition: { duration: 0.16 } }}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-4 flex flex-col justify-between h-full min-h-[120px] transition-colors hover:border-purple-500/30 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2 min-h-[28px]">
            <span className="text-xs font-medium text-zinc-400 leading-tight">Pending Approvals</span>
            <Badge variant="purple" dot size="sm" className="shrink-0">
              Action Req
            </Badge>
          </div>
          <div className="mt-auto pt-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-purple-400">
              {pendingItems.length}
            </div>
            <div className="text-[11px] text-purple-400/80 mt-1 truncate">Leaves + Corrections</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Biometric Device Health & Unmapped Users Operations Strip */}
      <motion.div variants={itemFadeUp}>
        <Card className="border-emerald-500/20 bg-zinc-900/70">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Biometric Terminals & Unmapped Device Users (Tabs 01 & 02)
              </CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                {deviceSummary.onlineDevices ?? 0} of {deviceSummary.totalDevices ?? 0} terminals online •{" "}
                {deviceSummary.unmappedUsersCount ?? 0} unmapped biometric user template(s) detected.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                icon={RefreshCw}
                isLoading={syncingDevices}
                onClick={handlePullAllLogs}
              >
                Pull All Device Logs
              </Button>
              <Link href="/attendance">
                <Button size="sm" variant="ghost" icon={Clock}>
                  Attendance Ledger
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(deviceSummary.devices || []).map((dev) => (
                <div
                  key={dev.id}
                  className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-100 truncate">{dev.name}</div>
                    <div className="text-[10px] font-mono text-zinc-400 truncate">
                      {dev.serialNumber} • {dev.branch}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge
                      variant={!dev.enabled ? "neutral" : dev.status === "Online" ? "success" : "danger"}
                      dot
                      size="sm"
                    >
                      {!dev.enabled ? "Disabled" : dev.status}
                    </Badge>
                    <div className="text-[10px] font-mono text-zinc-500 mt-1">
                      {dev.logsCount || 0} logs
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(deviceSummary.unmappedDeviceUsers || []).length > 0 && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-200 flex items-center gap-2">
                        Unmapped Biometric Device Users
                        <Badge variant="warning" size="sm">
                          {deviceSummary.unmappedDeviceUsers.length} Pending
                        </Badge>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        These terminal user IDs record punches that cannot be credited to timesheets until linked to an employee profile.
                      </p>
                    </div>
                  </div>
                  <Link href="/settings">
                    <Button size="xs" variant="ghost" className="text-xs text-amber-300 hover:text-amber-200">
                      Settings Tab 02 →
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {deviceSummary.unmappedDeviceUsers.map((du) => (
                    <div
                      key={du.deviceUserId}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800/90 hover:border-amber-500/40 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shrink-0">
                          #{du.deviceUserId}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-amber-200 transition-colors">
                            {du.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate">
                            Biometric Template
                          </div>
                        </div>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        icon={Link2}
                        className="shrink-0 text-[11px] h-7 px-2.5 border-zinc-700 hover:border-amber-500/50 hover:bg-amber-500/10 text-zinc-300 hover:text-amber-200"
                        onClick={() => {
                          setMappingUser(du);
                          setTargetEmployeeId(employeesList[0]?.id || "");
                        }}
                      >
                        Map
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 3. Operational Sections */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={containerStagger}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Section A: Pending Action Inbox */}
        <motion.div variants={itemFadeUp} className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Pending Action Inbox (Leaves & Corrections)</CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Approving leaves updates balances; approving corrections/WFH recalculates daily attendance immediately.
                </p>
              </div>
              <Link
                href="/leave"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
              >
                All Requests <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {pendingItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70 mb-2" />
                  <p className="font-semibold text-zinc-200">Inbox Zero!</p>
                  <p>All employee leave requests and attendance adjustments have been reviewed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
                  <Table containerClassName="border-0 rounded-none overflow-x-auto scrollbar-thin">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Employee</TableHead>
                        <TableHead className="min-w-[140px]">Request Type</TableHead>
                        <TableHead className="min-w-[190px]">Dates & Details</TableHead>
                        <TableHead className="min-w-[200px]">Reason</TableHead>
                        <TableHead className="min-w-[170px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                          <TableCell className="font-medium text-xs text-zinc-100">
                            <div className="flex items-center gap-2">
                              <Avatar name={item.employeeName} id={item.employeeId} size="sm" />
                              <div>
                                <div>{item.employeeName}</div>
                                <span className="block text-[10px] text-zinc-400 font-mono">
                                  {item.employeeId}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.sourceType === "LEAVE" ? "info" : "warning"}
                              size="sm"
                            >
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-300">
                            {item.details}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400 max-w-xs truncate" title={item.reason}>
                            {item.reason}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40 text-xs px-2 py-1"
                                icon={Check}
                                onClick={() => handleApprove(item)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-400 hover:bg-rose-950/40 text-xs px-2 py-1"
                                icon={X}
                                onClick={() => handleReject(item)}
                              >
                                Reject
                              </Button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInboxItem(item)}
                                title="Delete / Dismiss request"
                                className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Section B: Lateness Watchlist Widget */}
        <motion.div variants={itemFadeUp}>
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex flex-col items-start gap-1">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-base font-semibold text-zinc-100">
                  Lateness Watchlist
                </CardTitle>
                <Badge variant="warning" size="sm" className="shrink-0">
                  Live Threshold
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Check-ins past {cutoffLabel} ({shiftStart} + {graceMinutes}m grace).
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {lateWatchlist.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">
                  No habitual late arrivals detected under current Tab 04 policy.
                </div>
              ) : (
                lateWatchlist.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={emp.avatar} name={emp.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-100 truncate">
                          {emp.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {emp.department} • Avg: {emp.avgCheckIn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="warning" size="sm" className="font-mono">
                        {emp.lateCount}x Late
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleSendLateWarning(emp)}
                        title="Log punctuality warning to Audit Trail"
                        className="p-1 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Section: Talent Categorization & Promotion Recommendations */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
      >
        <Card className="border-indigo-500/20 bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/20">
          <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <CardTitle className="text-base font-bold text-zinc-100">
                  Talent Categorization & Executive Promotion Recommendations
                </CardTitle>
                <Badge variant="purple" size="sm">
                  Rank A / B / C Framework
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Evaluate employees based on sprint work output and conduct. HR recommendations route directly to Admin for executive sign-off.
              </p>
            </div>

            <Button
              size="sm"
              icon={TrendingUp}
              onClick={() => setIsPromotionModalOpen(true)}
              className="shrink-0"
            >
              Recommend Promotion
            </Button>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            {/* 3 Tier Distribution Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300">Rank A · Top Performers</span>
                  <RankBadge rank="Rank A" size="xs" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-purple-200">
                    {rankingStats?.counts?.["Rank A"] ?? 0}
                  </span>
                  <span className="text-xs text-purple-400">
                    ({rankingStats?.percentages?.["Rank A"] ?? 0}% of workforce)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Sprint velocity ≥ 90%, zero disciplinary flags, leadership standard.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-300">Rank B · Core Contributors</span>
                  <RankBadge rank="Rank B" size="xs" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-emerald-200">
                    {rankingStats?.counts?.["Rank B"] ?? 0}
                  </span>
                  <span className="text-xs text-emerald-400">
                    ({rankingStats?.percentages?.["Rank B"] ?? 0}% of workforce)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Solid deliverable completion, dependable collaboration, standard punctuality.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300">Rank C · Developing Tier</span>
                  <RankBadge rank="Rank C" size="xs" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-amber-200">
                    {rankingStats?.counts?.["Rank C"] ?? 0}
                  </span>
                  <span className="text-xs text-amber-400">
                    ({rankingStats?.percentages?.["Rank C"] ?? 0}% of workforce)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Requires technical coaching, probation support, or attendance alignment.
                </p>
              </div>
            </div>

            {/* Recommendations Log Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  HR Promotion Nominations & Executive Status
                </h4>
                <span className="text-xs text-zinc-400">
                  {recommendations.length} total recommendations
                </span>
              </div>

              {recommendations.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 rounded-xl border border-zinc-800 bg-zinc-950/40">
                  No promotion recommendations submitted yet. Click "Recommend Promotion" to evaluate an employee.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
                  <Table containerClassName="border-0 rounded-none overflow-x-auto scrollbar-thin">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Employee</TableHead>
                        <TableHead className="min-w-[160px]">Rank Progression</TableHead>
                        <TableHead className="min-w-[200px]">Work Output Evaluation</TableHead>
                        <TableHead className="min-w-[200px]">Conduct & Attitude</TableHead>
                        <TableHead className="min-w-[160px]">Decision Status</TableHead>
                        <TableHead className="min-w-[180px]">Executive Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendations.map((rec) => (
                        <TableRow key={rec.id} className="hover:bg-zinc-900/60">
                          <TableCell className="font-medium text-xs text-zinc-100">
                            <div>
                              <div className="font-semibold text-zinc-100">{rec.employeeName}</div>
                              <div className="text-[10px] text-zinc-400">{rec.jobTitle} • {rec.department}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs">
                              <RankBadge rank={rec.currentRank} size="xs" />
                              <span className="text-zinc-500">→</span>
                              <RankBadge rank={rec.recommendedRank} size="xs" />
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-xs">
                            <div className="font-mono text-[11px] font-bold text-indigo-400 mb-0.5">
                              Score: {rec.workScore}/100
                            </div>
                            <p className="text-zinc-300 text-[11px] line-clamp-2" title={rec.workJustification}>
                              {rec.workJustification}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs max-w-xs">
                            <div className="font-mono text-[11px] font-bold text-emerald-400 mb-0.5">
                              Score: {rec.behaviorScore}/100
                            </div>
                            <p className="text-zinc-300 text-[11px] line-clamp-2" title={rec.behaviorJustification}>
                              {rec.behaviorJustification}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                rec.status === "Approved"
                                  ? "success"
                                  : rec.status === "Pending Admin Review"
                                  ? "warning"
                                  : "danger"
                              }
                              size="sm"
                              dot={rec.status === "Pending Admin Review"}
                            >
                              {rec.status === "Pending Admin Review" ? "Pending Admin" : rec.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-400 max-w-xs">
                            {rec.adminDecisionNotes ? (
                              <p className="text-[11px] text-zinc-300 italic">
                                "{rec.adminDecisionNotes}"
                              </p>
                            ) : (
                              <span className="text-zinc-500 text-[11px]">Awaiting Admin review</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section C: Attendance Trend & Presence Ratios */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
      >
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Weekly Workforce Attendance & Shift Telemetry</CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                Comparison of On-Duty HQ Presence vs Remote Shift Staff across Monday – Friday.
              </p>
            </div>
            <Badge variant="success" dot>Live Sync</Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <AttendanceTrendChart />

            <div className="border-t border-zinc-800/80 pt-4">
              <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                Presence Ratios by Department
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {departmentAttendance.map((d) => (
                  <div
                    key={d.department}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2.5"
                  >
                    <div className="font-semibold text-xs text-zinc-200">{d.department}</div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Present</span>
                        <span className="font-semibold text-emerald-400">{d.presentRate}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${d.presentRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-zinc-400">On Leave</span>
                        <span className="text-indigo-400">{d.leaveRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Absent / Unpaid</span>
                        <span className="text-rose-400">{d.absentRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSaved={() => {
          reportService.invalidateCache("hr");
          loadData(true);
        }}
      />

      <Modal
        isOpen={Boolean(mappingUser)}
        onClose={() => setMappingUser(null)}
        title="Link Biometric ID to HR Employee"
        description={
          mappingUser
            ? `Assign Device User #${mappingUser.deviceUserId} (${mappingUser.name}) to an employee directory profile.`
            : ""
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmMapDeviceUser} className="space-y-4">
          <Select
            label="Select HR Employee"
            options={employeesList.map((e) => ({
              value: e.id,
              label: `${e.name} (${e.id}) — ${e.department}`,
            }))}
            value={targetEmployeeId}
            onChange={(e) => setTargetEmployeeId(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setMappingUser(null)}>
              Cancel
            </Button>
            <Button type="submit">Confirm Mapping</Button>
          </div>
        </form>
      </Modal>

      <PromotionRecommendationModal
        isOpen={isPromotionModalOpen}
        onClose={() => setIsPromotionModalOpen(false)}
        onSubmitted={() => loadData(true)}
      />
    </motion.div>
  );
}
