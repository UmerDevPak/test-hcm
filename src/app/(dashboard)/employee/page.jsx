"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { containerStagger, itemFadeUp, scrollViewport } from "@/lib/animationVariants";
import {
  Clock,
  CalendarDays,
  Calendar,
  AlertTriangle,
  CreditCard,
  Download,
  Plus,
  ArrowRight,
  Building2,
  Briefcase,
  User,
  Printer,
  Megaphone,
  Trash2,
  FileEdit,
  ShieldCheck,
  Lock,
  Award,
  Crown,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { reportService } from "@/services/reportService";
import { attendanceService } from "@/services/attendanceService";
import { leaveService } from "@/services/leaveService";
import { correctionService } from "@/services/correctionService";
import { employeeService } from "@/services/employeeService";
import { performanceService } from "@/services/performanceService";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeaveRequestModal } from "@/components/leave/LeaveRequestModal";
import { CorrectionRequestModal } from "@/components/attendance/CorrectionRequestModal";
import { PayslipModal } from "@/components/payroll/PayslipModal";
import { RankBadge } from "@/components/performance/RankBadge";
import { CelebrationBanner } from "@/components/performance/CelebrationBanner";

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  const targetEmpId = user?.employeeId || "EMP-003";
  const cachedEmpMetrics = reportService.peekCachedMetrics(`emp_${targetEmpId}`);
  const [metrics, setMetrics] = useState(cachedEmpMetrics);
  const [loading, setLoading] = useState(!cachedEmpMetrics);
  const [punchLoading, setPunchLoading] = useState(false);
  const [liveTime, setLiveTime] = useState("");
  const [todayPunch, setTodayPunch] = useState(cachedEmpMetrics?.todayPunch || null);
  const [workMode, setWorkMode] = useState("Office (HQ)");
  const [fullEmployee, setFullEmployee] = useState(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => {
    if (!cachedEmpMetrics?.calendarDays?.length) return null;
    const currentDay = new Date().getDate();
    return (
      cachedEmpMetrics.calendarDays.find((d) => d.day === currentDay) ||
      cachedEmpMetrics.calendarDays[0]
    );
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async (force = false) => {
    try {
      const empId = user?.employeeId || "EMP-003";
      const [data, fullEmp] = await Promise.all([
        reportService.getEmployeeDashboardMetrics(empId, user, force),
        employeeService.getEmployeeById(empId),
      ]);
      setMetrics(data);
      setFullEmployee(fullEmp);
      setTodayPunch(data.todayPunch);
      const currentDay = new Date().getDate();
      const todayCell = data.calendarDays.find((d) => d.day === currentDay) || data.calendarDays[0];
      setSelectedCalendarDay(todayCell);
    } catch (err) {
      console.warn("[EmployeeDashboard] Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

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

  const handleCancelLeave = async (id) => {
    try {
      await leaveService.deleteRequest(id);
      reportService.invalidateCache(`emp_${targetEmpId}`);
      notifySuccess("Leave Cancelled", "Your leave application has been withdrawn.");
      loadData(true);
    } catch (err) {
      notifyError("Failed to cancel leave", err.message);
    }
  };

  const handleDeleteCorrection = async (id) => {
    try {
      await correctionService.deleteCorrection(id);
      reportService.invalidateCache(`emp_${targetEmpId}`);
      notifySuccess("Request Withdrawn", "Pending attendance correction withdrawn.");
      loadData(true);
    } catch (err) {
      notifyError("Action Failed", err.message);
    }
  };

  const handlePunchToggle = async () => {
    const empId = user?.employeeId || "EMP-003";
    const empName = user?.displayName || "Elena Rostova";
    setPunchLoading(true);

    try {
      if (!todayPunch || !todayPunch.clockIn) {
        const punch = await attendanceService.clockIn({
          employeeId: empId,
          employeeName: empName,
          location: workMode,
          workMode,
        });
        setTodayPunch(punch);
        notifySuccess("Web Check-In Confirmed", `Registered ${workMode} check-in at ${punch.clockIn}`);
      } else if (!todayPunch.clockOut) {
        const punch = await attendanceService.clockOut({
          employeeId: empId,
        });
        setTodayPunch(punch);
        notifySuccess("Web Check-Out Confirmed", `Registered check-out at ${punch.clockOut}`);
      }
      reportService.invalidateCache(`emp_${empId}`);
      // Silent non-blocking refresh
      loadData(false);
    } catch (err) {
      notifyError("Attendance Action Failed", err.message);
    } finally {
      setPunchLoading(false);
    }
  };

  const handleDownloadPayslip = () => {
    setIsPayslipModalOpen(true);
    notifyInfo("Payslip Ready", "Opening itemized payslip statement. Use Print/Save as PDF.");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const {
    balances = { annual: 10, sick: 7, casual: 8 },
    leaveRequests = [],
    weeklyHours = { logged: 34.5, target: 40, percentage: 86, remaining: 5.5 },
    latesThisMonth = 0,
    lateThreshold = 3,
    calendarDays = [],
    latestPayslip = null,
    announcements = [],
    employee = {},
    assignedShift = { name: "General Office Shift", effectiveStartTime: "09:00", effectiveEndTime: "18:00" },
    effectivePolicies = { graceMinutes: 15, latePenaltyDays: 0.5 },
    upcomingHolidays = [],
    leaveQuotas = { annual: 14, sick: 8, casual: 10 },
    myCorrections = [],
    config = {},
  } = metrics || {};

  const isClockedIn = Boolean(todayPunch?.clockIn && !todayPunch?.clockOut);
  const isClockedOut = Boolean(todayPunch?.clockIn && todayPunch?.clockOut);
  const lockDate = config?.attendanceRule?.attendanceLockedUpTo || "";

  let statusBadgeVariant = "neutral";
  let statusText = "Not Checked In";
  if (isClockedIn) {
    statusBadgeVariant = "success";
    statusText = `Checked In at ${todayPunch.clockIn} (${todayPunch.location || "Office"})`;
  } else if (isClockedOut) {
    statusBadgeVariant = "info";
    statusText = `Checked Out at ${todayPunch.clockOut}`;
  }

  const isNearLatePenalty = latesThisMonth >= lateThreshold - 1;
  const isLatePenaltyReached = latesThisMonth >= lateThreshold;

  const recentShifts = calendarDays
    .filter((d) => !d.isWeekend && d.status !== "Upcoming" && d.clockIn)
    .slice(-5)
    .reverse();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerStagger}
      className="space-y-6"
    >
      {/* 0. Promotion Celebration Notification Banner */}
      <CelebrationBanner
        employee={fullEmployee || employee}
        onDismiss={() => loadData(true)}
      />

      {/* 1. Header */}
      <motion.div
        variants={itemFadeUp}
        className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-indigo-950/40 border border-zinc-800 shadow-elevated"
      >
        <div className="relative z-10 flex items-center gap-4">
          <Avatar
            src={user?.photoURL || employee.avatar}
            name={user?.displayName || employee.name || "Elena Rostova"}
            size="lg"
            className="ring-2 ring-indigo-500/40"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-50">
                Welcome back, {user?.displayName?.split(" ")[0] || employee.name?.split(" ")[0] || "Elena"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                {user?.employeeId || employee.id || "EMP-003"}
              </span>
              <RankBadge rank={fullEmployee?.ranking || employee?.ranking || "Rank B"} size="sm" showTier />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-zinc-400">
              <Badge variant="purple" size="sm" className="gap-1">
                <Building2 className="w-3 h-3" />
                {user?.department || employee.department || "Engineering"}
              </Badge>
              <Badge variant="neutral" size="sm" className="gap-1">
                <Briefcase className="w-3 h-3" />
                {user?.jobTitle || employee.jobTitle || "Staff Software Engineer"}
              </Badge>
              <span className="text-zinc-500 hidden sm:inline">•</span>
              <span className="text-zinc-400 text-[11px] font-medium">
                {formatDate(new Date().toISOString())}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 relative z-10">
          <Button
            variant="outline"
            size="sm"
            icon={FileEdit}
            onClick={() => setIsCorrectionModalOpen(true)}
          >
            Correction / WFH / OT
          </Button>
          <Link href="/profile">
            <Button variant="secondary" size="sm" icon={User}>
              My Profile
            </Button>
          </Link>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setIsLeaveModalOpen(true)}
          >
            Apply Leave
          </Button>
        </div>
      </motion.div>

      {/* Assigned Shift & Active Policy Strip */}
      <motion.div variants={itemFadeUp}>
        <Card className="border-indigo-500/20 bg-white dark:bg-zinc-900/70">
          <CardContent className="py-3 px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 block">Assigned Shift (Tab 06)</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {assignedShift.name} ({assignedShift.effectiveStartTime}–{assignedShift.effectiveEndTime})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 block">Grace & Penalty (Tab 04)</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {effectivePolicies.graceMinutes}m Grace • {lateThreshold} Lates = {effectivePolicies.latePenaltyDays ?? 0.5}d
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 block">Next Holiday (Tab 08)</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {upcomingHolidays[0]
                      ? `${upcomingHolidays[0].name} (${upcomingHolidays[0].date})`
                      : "No upcoming holidays"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 block">Payroll Attendance Lock</span>
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-300">
                    {lockDate ? `Locked ≤ ${lockDate}` : "Open for Corrections"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 1.5 Performance Tier & Career Ranking Card */}
      <motion.div variants={itemFadeUp}>
        <Card className="border-indigo-500/20 bg-white dark:bg-gradient-to-r dark:from-zinc-900 dark:via-zinc-900 dark:to-indigo-950/20">
          <CardContent className="py-4 px-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      My Performance Tier & Workforce Ranking
                    </h3>
                    <RankBadge rank={fullEmployee?.ranking || employee.ranking || "Rank B"} size="sm" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Your dynamic rank is evaluated by HR based on sprint delivery output, task completion velocity, and team collaboration.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">Work Delivery</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{fullEmployee?.workScore ?? 96}%</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
                  <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">Conduct & Attitude</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{fullEmployee?.behaviorScore ?? 95}%</span>
                </div>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Sprint Deliverables & Attendance</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{fullEmployee?.workScore ?? 96}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${fullEmployee?.workScore ?? 96}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Conduct, Mentorship & Collaboration</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{fullEmployee?.behaviorScore ?? 95}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${fullEmployee?.behaviorScore ?? 95}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Top Action & Metrics Cards */}
      <motion.div
        variants={containerStagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch"
      >
        {/* Card 1: Web Punch Clock with Mode Selector */}
        <motion.div variants={itemFadeUp} whileHover={{ y: -3, transition: { duration: 0.16 } }} className="h-full">
          <Card className="p-4 flex flex-col justify-between h-full min-h-[240px] relative overflow-hidden border-indigo-500/30 bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:to-indigo-950/20">
            <div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Web Punch Clock</span>
                <Badge variant={statusBadgeVariant} dot size="sm">
                  {isClockedIn ? "Active Shift" : isClockedOut ? "Completed" : "Offline"}
                </Badge>
              </div>

              <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1.5">
                <Clock className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                <span>{liveTime || "09:00:00 AM"}</span>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium truncate">
                {statusText}
              </p>

              {/* Work Mode Selector (Office / WFH / On-Duty) */}
              {!isClockedIn && !isClockedOut && (
                <div className="mt-3 grid grid-cols-3 gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 text-[10px]">
                  {["Office (HQ)", "WFH", "On-Duty"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWorkMode(m)}
                      className={`py-1 px-1.5 rounded font-semibold transition-colors ${
                        workMode === m
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      {m === "Office (HQ)" ? "Office" : m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                className="w-full font-semibold text-xs"
                variant={isClockedIn ? "danger" : "primary"}
                icon={Clock}
                isLoading={punchLoading}
                disabled={isClockedOut}
                onClick={handlePunchToggle}
              >
                {isClockedOut
                  ? "Shift Completed"
                  : isClockedIn
                  ? "Web Check-Out"
                  : `Check-In (${workMode === "Office (HQ)" ? "Office" : workMode})`}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Card 2: Weekly Hours Logged */}
        <motion.div variants={itemFadeUp} whileHover={{ y: -3, transition: { duration: 0.16 } }} className="h-full">
          <Card className="p-4 flex flex-col justify-between h-full min-h-[240px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Weekly Hours Logged</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {weeklyHours.logged}
                </span>
                <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 font-mono">
                  / {weeklyHours.target} hrs
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, weeklyHours.percentage)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                  <span>{weeklyHours.percentage}% logged</span>
                  <span>{weeklyHours.remaining}h remaining</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 mt-auto">
              Target: {weeklyHours.target} hrs/wk • {assignedShift.name}
            </div>
          </Card>
        </motion.div>

        {/* Card 3: Lates This Month */}
        <motion.div variants={itemFadeUp} whileHover={{ y: -3, transition: { duration: 0.16 } }} className="h-full">
          <Card className="p-4 flex flex-col justify-between h-full min-h-[240px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Lates This Month</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {latesThisMonth}
                </span>
                <Badge
                  variant={isLatePenaltyReached ? "danger" : isNearLatePenalty ? "warning" : "success"}
                  size="sm"
                >
                  {isLatePenaltyReached
                    ? "Penalty Applied"
                    : isNearLatePenalty
                    ? "Near Limit"
                    : "Good Standing"}
                </Badge>
              </div>

              <div className="mt-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] leading-tight">
                {isLatePenaltyReached ? (
                  <p className="text-rose-600 dark:text-rose-400 font-medium">
                    {lateThreshold} lates reached: {effectivePolicies.latePenaltyDays ?? 0.5}-day deduction applied per Tab 04.
                  </p>
                ) : isNearLatePenalty ? (
                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                    Warning: {Math.max(1, lateThreshold - latesThisMonth)} more late arrival triggers a {effectivePolicies.latePenaltyDays ?? 0.5}-day penalty.
                  </p>
                ) : (
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Shift starts {assignedShift.effectiveStartTime} ({effectivePolicies.graceMinutes}m grace). {Math.max(0, lateThreshold - latesThisMonth)} late check-ins remaining before penalty.
                  </p>
                )}
              </div>
            </div>

            <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 mt-auto">
              Tab 04 Policy: {lateThreshold} lates = {effectivePolicies.latePenaltyDays ?? 0.5} day deduction
            </div>
          </Card>
        </motion.div>

        {/* Card 4: Leave Balance Summary */}
        <motion.div variants={itemFadeUp} whileHover={{ y: -3, transition: { duration: 0.16 } }} className="h-full">
          <Card className="p-4 flex flex-col justify-between h-full min-h-[240px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Leave Balance Summary</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                  <CalendarDays className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {(balances.annual || 0) + (balances.sick || 0) + (balances.casual || 0)}{" "}
                <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">Days Available</span>
              </div>

              <div className="mt-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Annual Leave</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {balances.annual} / {leaveQuotas.annual} left
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Sick Leave</span>
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {balances.sick} / {leaveQuotas.sick} left
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Casual Leave</span>
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {balances.casual} / {leaveQuotas.casual} left
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 mt-auto">
              Tab 09 Quota: {leaveQuotas.annual} Annual • {leaveQuotas.sick} Sick • {leaveQuotas.casual} Casual
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* 3. Calendar + Latest Payslip Row */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch"
      >
        <Card className="lg:col-span-2 flex flex-col justify-between h-full bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span>My Monthly Attendance Calendar</span>
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Synchronized with Shifts, Public Holidays, WFH/On-Duty, and Approved Leaves. Click any day to inspect.
              </p>
            </div>
            <Badge variant="neutral" size="sm" className="font-mono shrink-0">
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 pb-1 border-b border-zinc-100 dark:border-zinc-800">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((item) => {
                const isSelected = selectedCalendarDay?.day === item.day;

                let cellColor = "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50";
                let dotColor = "bg-zinc-400 dark:bg-zinc-600";

                if (item.status === "Present" || item.status === "Off-Day Work" || item.status === "Holiday Work") {
                  cellColor = "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30";
                  dotColor = "bg-emerald-500 dark:bg-emerald-400";
                } else if (item.status === "WFH" || item.status === "On-Duty") {
                  cellColor = "border-cyan-300 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/30";
                  dotColor = "bg-cyan-500 dark:bg-cyan-400";
                } else if (item.status === "Late" || item.status === "Missing Punch") {
                  cellColor = "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30";
                  dotColor = "bg-amber-500 dark:bg-amber-400";
                } else if (item.status === "Half-Day") {
                  cellColor = "border-purple-300 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30";
                  dotColor = "bg-purple-500 dark:bg-purple-400";
                } else if (item.status === "Leave" || item.status === "Holiday") {
                  cellColor = "border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30";
                  dotColor = "bg-blue-500 dark:bg-blue-400";
                } else if (item.status === "Absent") {
                  cellColor = "border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30";
                  dotColor = "bg-rose-500 dark:bg-rose-400";
                } else if (item.status === "Weekend") {
                  cellColor = "border-zinc-200 dark:border-zinc-900 bg-zinc-100/60 dark:bg-zinc-950/50 text-zinc-400 dark:text-zinc-600";
                  dotColor = "bg-zinc-300 dark:bg-zinc-700";
                }

                return (
                  <button
                    key={item.day}
                    onClick={() => setSelectedCalendarDay(item)}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-mono transition-all duration-150 ${cellColor} ${
                      isSelected ? "ring-2 ring-indigo-500 shadow-glow" : ""
                    }`}
                  >
                    <span className="font-semibold">{item.day}</span>
                    {!item.isWeekend && item.status !== "Upcoming" && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-1 ${dotColor}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedCalendarDay && (
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      {selectedCalendarDay.date} ({selectedCalendarDay.dayOfWeek})
                    </span>
                    <Badge
                      variant={
                        ["Present", "WFH", "On-Duty"].includes(selectedCalendarDay.status)
                          ? "success"
                          : ["Late", "Missing Punch"].includes(selectedCalendarDay.status)
                          ? "warning"
                          : selectedCalendarDay.status === "Half-Day"
                          ? "purple"
                          : ["Leave", "Holiday"].includes(selectedCalendarDay.status)
                          ? "info"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {selectedCalendarDay.status}
                    </Badge>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">{selectedCalendarDay.details}</p>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-mono shrink-0">
                  <div>
                    <span className="text-zinc-500 block">Check-In</span>
                    <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                      {selectedCalendarDay.clockIn || "--:--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Check-Out</span>
                    <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                      {selectedCalendarDay.clockOut || "--:--"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Duration</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      {selectedCalendarDay.totalHours || "--"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Color Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 mt-auto">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span>WFH / On-Duty</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Late / Missing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Half-Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Leave / Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                <span>Off Day</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest Payslip Card */}
        <Card className="lg:col-span-1 flex flex-col justify-between h-full border-indigo-500/20 bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:via-zinc-900 dark:to-indigo-950/20">
          <CardHeader className="flex flex-col items-start gap-1 pb-3">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span>Latest Payslip</span>
              </CardTitle>
              <Badge variant={latestPayslip?.status === "Finalized" ? "success" : "info"} size="sm" className="shrink-0">
                {latestPayslip?.status || "Active"}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {latestPayslip?.period || "Current Cycle"} • Method: {latestPayslip?.calculationMethod || "WorkingDays"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Net Take-Home Pay</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(latestPayslip?.netPay || 0)}
                </span>
              </div>

              <div className="space-y-1.5 text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Gross Earnings (Tab 10)</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-200">
                    {formatCurrency(latestPayslip?.totalGross || 0)}
                  </span>
                </div>
                {(latestPayslip?.overtimePay || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Overtime ({latestPayslip.overtimeHours}h)</span>
                    <span className="font-mono">+{formatCurrency(latestPayslip.overtimePay)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Tax Slabs & PF/EOBI</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    -{formatCurrency((latestPayslip?.tax ?? latestPayslip?.totalTaxes ?? 0) + (latestPayslip?.pfDeduction || 0) + (latestPayslip?.eobiDeduction || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Attendance / Late Penalties</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    -{formatCurrency(latestPayslip?.attendanceDeduction || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-2 pt-2">
              <Button
                className="w-full text-xs font-semibold"
                icon={Download}
                onClick={handleDownloadPayslip}
              >
                Download PDF Payslip
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs"
                icon={Printer}
                onClick={() => setIsPayslipModalOpen(true)}
              >
                View Itemized Breakdown
              </Button>

              <div className="text-center pt-1">
                <Link
                  href="/payroll"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                >
                  Browse Finalized Payslips <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. Secondary Operations Row */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch"
      >
        <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
          {/* My Leave Requests */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span>My Leave Requests</span>
                </CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Automatically validates quotas, weekly offs, holidays, blackout dates, and sandwich rules.
                </p>
              </div>
              <Button size="sm" icon={Plus} onClick={() => setIsLeaveModalOpen(true)} className="shrink-0">
                Apply Leave
              </Button>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <EmptyState
                  compact
                  avatarUrl={user?.photoURL || employee.avatar}
                  title="No Leave Requests"
                  description="You have no active leave applications. Your statutory quotas are ready whenever needed."
                  actionLabel="Apply for Leave"
                  actionIcon={Plus}
                  onAction={() => setIsLeaveModalOpen(true)}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration & Dates</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium text-xs text-zinc-900 dark:text-zinc-100">{req.leaveType}</TableCell>
                          <TableCell className="text-xs text-zinc-700 dark:text-zinc-300">
                            {req.startDate} to {req.endDate}{" "}
                            <span className="text-[10px] text-zinc-500 font-mono">
                              ({req.daysCount} d)
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs truncate">{req.reason}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                req.status === "Approved"
                                  ? "success"
                                  : req.status === "Rejected"
                                  ? "danger"
                                  : "warning"
                              }
                              size="sm"
                            >
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {req.status === "Pending" && (
                              <button
                                type="button"
                                onClick={() => handleCancelLeave(req.id)}
                                title="Withdraw pending leave"
                                className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Correction, WFH & OT Requests */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                  <span>My Correction, WFH & OT Requests</span>
                </CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Submit missing punches, field visits, WFH days, or overtime claims within {config?.attendanceRule?.correctionWindowDays ?? 7} days.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={Plus}
                onClick={() => setIsCorrectionModalOpen(true)}
                className="shrink-0"
              >
                New Request
              </Button>
            </CardHeader>
            <CardContent>
              {myCorrections.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No attendance correction or WFH requests submitted yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myCorrections.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-xs text-zinc-900 dark:text-zinc-100">{c.requestType}</TableCell>
                          <TableCell className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                            {c.date} • {c.requestedTime}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs truncate">{c.reason}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                c.status === "Approved"
                                  ? "success"
                                  : c.status === "Rejected"
                                  ? "danger"
                                  : "warning"
                              }
                              size="sm"
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {c.status === "Pending" && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCorrection(c.id)}
                                title="Withdraw pending request"
                                className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Verified Shift Logs */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <span>Recent Verified Shift Logs</span>
                </CardTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Timestamps and status evaluations from your latest shifts.
                </p>
              </div>
              <Link
                href="/attendance"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1 shrink-0"
              >
                Full Board <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentShifts.map((shift) => (
                      <TableRow key={shift.day}>
                        <TableCell className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                          {shift.date}{" "}
                          <span className="text-[10px] text-zinc-500 font-normal">({shift.dayOfWeek})</span>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-700 dark:text-zinc-300 font-mono">
                          {shift.clockIn || "--:--"}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-700 dark:text-zinc-300 font-mono">
                          {shift.clockOut || "--:--"}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400">
                          {shift.totalHours || "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              ["Present", "WFH", "On-Duty"].includes(shift.status)
                                ? "success"
                                : shift.status === "Late"
                                ? "warning"
                                : shift.status === "Half-Day"
                                ? "purple"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {shift.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Company Policy Noticeboard */}
        <Card className="lg:col-span-1 flex flex-col justify-between h-full">
          <CardHeader className="pb-3 flex flex-col items-start gap-1">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                <span>Policy & Holiday Noticeboard</span>
              </CardTitle>
              <Badge variant="warning" size="sm" className="shrink-0">
                Live Sync
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Active rules, shift schedules, and upcoming public holidays.
            </p>
          </CardHeader>
          <CardContent className="space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${ann.badgeColor}`}
                    >
                      {ann.category}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{ann.date}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{ann.title}</h4>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">{ann.summary}</p>
                  <div className="text-[10px] text-zinc-500 font-medium pt-1">Posted by {ann.author}</div>
                </div>
              ))}
            </div>

            <div className="pt-3 text-center border-t border-zinc-100 dark:border-zinc-800/80 mt-auto">
              <Link
                href="/documents"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
              >
                View Policy Handbooks & Docs <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modals */}
      <LeaveRequestModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSubmitted={() => {
          reportService.invalidateCache(`emp_${targetEmpId}`);
          loadData(true);
        }}
      />

      <CorrectionRequestModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        onSubmitted={() => {
          reportService.invalidateCache(`emp_${targetEmpId}`);
          loadData(true);
        }}
      />

      <PayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        payslip={latestPayslip}
        runInfo={{
          period: latestPayslip?.period || "Current Period",
          payDate: latestPayslip?.payDate || "Current",
          status: latestPayslip?.status || "Active",
        }}
      />
    </motion.div>
  );
}
