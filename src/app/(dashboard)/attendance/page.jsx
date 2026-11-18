"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { containerStagger, itemFadeUp, scrollViewport } from "@/lib/animationVariants";
import {
  Clock,
  Calendar,
  CheckCircle2,
  Users,
  Building,
  Laptop,
  Briefcase,
  FileEdit,
  PlayCircle,
  Cpu,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { attendanceService } from "@/services/attendanceService";
import { correctionService } from "@/services/correctionService";
import { hcmConfigService } from "@/services/hcmConfigService";
import { reportService } from "@/services/reportService";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CorrectionRequestModal } from "@/components/attendance/CorrectionRequestModal";

export default function AttendancePage() {
  const { user, isAdmin, isHR } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  const [records, setRecords] = useState(
    () => attendanceService.peekCachedTodayRecords() || []
  );
  const [corrections, setCorrections] = useState([]);
  const [stats, setStats] = useState(null);
  const [todayPunch, setTodayPunch] = useState(null);
  const [config, setConfig] = useState(null);
  const [locationType, setLocationType] = useState("Office (HQ)");
  const [loading, setLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  const employeeId = user?.employeeId || "EMP-001";
  const canManage = isAdmin || isHR;

  const refreshData = async (force = false) => {
    const [allRecords, punch, corrList, cfg] = await Promise.all([
      attendanceService.getTodayRecords(force),
      attendanceService.getEmployeeTodayRecord(employeeId),
      correctionService.getAllCorrections(canManage ? {} : { employeeId }, force),
      hcmConfigService.getConfig(force),
    ]);
    const currentStats = await attendanceService.getAttendanceStats(allRecords);
    setRecords(allRecords);
    setStats(currentStats);
    setTodayPunch(punch);
    setCorrections(corrList);
    setConfig(cfg);
  };

  useEffect(() => {
    refreshData();
    setCurrentTime(
      new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    );
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    }, 1000);

    const handleConfigChange = () => {
      refreshData(true);
    };
    window.addEventListener("hcm_config_updated", handleConfigChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("hcm_config_updated", handleConfigChange);
    };
  }, [employeeId, canManage]);

  const handlePunchIn = async () => {
    setLoading(true);
    try {
      const punch = await attendanceService.clockIn({
        employeeId: user?.employeeId || "EMP-001",
        employeeName: user?.displayName || "Admin User",
        location: locationType,
        workMode: locationType,
      });
      setTodayPunch(punch);
      reportService.invalidateCache();
      notifySuccess("Clock In Registered", `Recorded ${locationType} punch at ${punch.clockIn}`);
      refreshData(true);
    } catch (err) {
      notifyError("Clock In Rejected", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    try {
      const punch = await attendanceService.clockOut({
        employeeId: user?.employeeId || "EMP-001",
      });
      setTodayPunch(punch);
      reportService.invalidateCache();
      notifySuccess("Clock Out Registered", `Recorded check-out at ${punch.clockOut}`);
      refreshData(true);
    } catch (err) {
      notifyError("Clock Out Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const res = await attendanceService.reprocessAttendance({
        actor: user?.displayName || "HR Operations",
      });
      reportService.invalidateCache();
      await refreshData(true);
      notifySuccess(
        "Attendance Re-processed",
        `Evaluated ${res.updatedCount} logs under active Shifts, Late, OT & Holiday policies.`
      );
    } catch (err) {
      notifyError("Re-processing Failed", err.message);
    } finally {
      setReprocessing(false);
    }
  };

  const handleReviewCorrection = async (item, decision) => {
    try {
      await correctionService.reviewCorrection(
        item.id,
        decision,
        user?.displayName || "HR Manager"
      );
      reportService.invalidateCache();
      await refreshData(true);
      if (decision === "Approved") {
        notifySuccess("Correction Approved", `Updated attendance ledger for ${item.employeeName} (${item.date}).`);
      } else {
        notifyInfo("Correction Rejected", `Marked ${item.requestType} as rejected.`);
      }
    } catch (err) {
      notifyError("Review Failed", err.message);
    }
  };

  const isClockedIn = Boolean(todayPunch?.clockIn && !todayPunch?.clockOut);
  const onlineDevices = (config?.devices || []).filter((d) => d.status === "Online" && d.enabled).length;
  const totalDevices = (config?.devices || []).length;

  const getStatusVariant = (status) => {
    if (["Present", "Off-Day Work", "Holiday Work"].includes(status)) return "success";
    if (["WFH", "On-Duty"].includes(status)) return "info";
    if (["Late", "Missing Punch", "On Leave"].includes(status)) return "warning";
    if (status === "Half-Day") return "purple";
    return "danger";
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerStagger}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemFadeUp}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Attendance & Time Tracking
            </h1>
            {totalDevices > 0 && (
              <Badge variant="success" size="sm" dot>
                <Cpu className="w-3 h-3" /> {onlineDevices}/{totalDevices} Biometric Terminals
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Policy-driven check-ins ({config?.latePolicy?.graceMinutes ?? 15}m grace, {config?.attendanceRule?.duplicatePunchGapMinutes ?? 5}m duplicate filter), WFH/On-Duty tracking, and OT evaluation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={FileEdit}
            onClick={() => setIsCorrectionModalOpen(true)}
          >
            Request Correction / WFH / OT
          </Button>
          {canManage && (
            <Button
              size="sm"
              variant="secondary"
              icon={PlayCircle}
              isLoading={reprocessing}
              onClick={handleReprocess}
            >
              Re-process Attendance
            </Button>
          )}
        </div>
      </motion.div>

      {/* KPI stats */}
      <motion.div
        variants={containerStagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemFadeUp}>
          <StatCard
            title="On-Duty Present"
            value={stats?.present ?? 0}
            subtext="Office, WFH & Field Duty"
            icon={CheckCircle2}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
          />
        </motion.div>
        <motion.div variants={itemFadeUp}>
          <StatCard
            title="On Planned Leave"
            value={stats?.onLeave ?? 0}
            subtext="Approved absence"
            icon={Calendar}
            iconColor="text-amber-400"
            iconBg="bg-amber-500/10"
          />
        </motion.div>
        <motion.div variants={itemFadeUp}>
          <StatCard
            title="Attendance Rate"
            value={`${stats?.presentRate ?? 0}%`}
            subtext="Target: >85%"
            icon={Clock}
            iconColor="text-indigo-400"
            iconBg="bg-indigo-500/10"
          />
        </motion.div>
        <motion.div variants={itemFadeUp}>
          <StatCard
            title="Active Workforce"
            value={stats?.totalEmployees ?? 0}
            subtext="Headcount tracked"
            icon={Users}
            iconColor="text-purple-400"
            iconBg="bg-purple-500/10"
          />
        </motion.div>
      </motion.div>

      {/* Punch Clock Station Card */}
      <motion.div
        variants={itemFadeUp}
        whileHover={{ y: -3, transition: { duration: 0.16 } }}
      >
        <Card className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Clock className="w-3.5 h-3.5" />
                Live Terminal
              </div>
              <div className="text-4xl font-extrabold tracking-tight font-mono text-zinc-900 dark:text-zinc-50">
                {currentTime || "09:30:00 AM"}
              </div>
              <p className="text-xs text-zinc-400">
                Logged as <strong>{user?.displayName}</strong> ({user?.jobTitle})
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-1 bg-zinc-100 dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setLocationType("Office (HQ)")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                    locationType === "Office (HQ)"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Building className="w-3.5 h-3.5" /> Office
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType("WFH")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                    locationType === "WFH"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" /> WFH
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType("On-Duty")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                    locationType === "On-Duty"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" /> On-Duty
                </button>
              </div>

              {!isClockedIn ? (
                <Button
                  variant="primary"
                  size="lg"
                  icon={Clock}
                  isLoading={loading}
                  onClick={handlePunchIn}
                >
                  Punch Clock In
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="lg"
                  icon={Clock}
                  isLoading={loading}
                  onClick={handlePunchOut}
                >
                  Punch Clock Out
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Today's Attendance Ledger */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Today&apos;s Attendance Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {records.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Clock}
                  title="No Logs Recorded Yet"
                  description="No employee attendance records logged yet for today. Use the terminal above to punch in."
                  actionLabel="Punch Clock In"
                  onAction={handlePunchIn}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shift & Late/OT</TableHead>
                      <TableHead>Mode / Location</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.employeeName} size="sm" />
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {r.employeeName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(r.status)} dot>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="text-zinc-300">{r.shiftName || "General Shift"}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]">
                            {(r.lateMinutes || 0) > 0 && (
                              <span className="text-amber-400">+{r.lateMinutes}m late</span>
                            )}
                            {(r.overtimeHours || 0) > 0 && (
                              <span className="text-emerald-400">+{r.overtimeHours}h OT</span>
                            )}
                            {!(r.lateMinutes > 0) && !(r.overtimeHours > 0) && (
                              <span className="text-zinc-500">On Schedule</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs">{r.location || "Office (HQ)"}</TableCell>
                        <TableCell className="font-mono text-zinc-200">{r.clockIn || "—"}</TableCell>
                        <TableCell className="font-mono text-zinc-200">
                          {r.clockOut || (r.clockIn ? "Working..." : "—")}
                        </TableCell>
                        <TableCell className="font-mono text-zinc-400">
                          {r.totalHours || (r.clockIn ? "In progress" : "0 hrs")}
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

      {/* Pending / Recent Corrections, WFH & OT Requests */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
      >
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Corrections, WFH & Overtime Requests</CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                {canManage
                  ? "Approve or reject employee missing punches, WFH days, and overtime claims."
                  : "Track your submitted attendance regularization, WFH, and field-duty claims."}
              </p>
            </div>
            <Badge variant="info" size="sm">
              {corrections.filter((c) => c.status === "Pending").length} Pending
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {corrections.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No correction, WFH, or OT requests found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date & Requested Time</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && <TableHead className="text-right">Review</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {corrections.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-xs text-zinc-100">
                          {c.employeeName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="neutral" size="sm">{c.requestType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-300">
                          {c.date} • {c.requestedTime}
                          {c.requestedClockOut ? ` - ${c.requestedClockOut}` : ""}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-400 max-w-xs truncate" title={c.reason}>
                          {c.reason}
                        </TableCell>
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
                        {canManage && (
                          <TableCell className="text-right">
                            {c.status === "Pending" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="success"
                                  icon={Check}
                                  onClick={() => handleReviewCorrection(c, "Approved")}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  icon={X}
                                  onClick={() => handleReviewCorrection(c, "Rejected")}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-500">
                                {c.reviewedBy ? `By ${c.reviewedBy}` : "Reviewed"}
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <CorrectionRequestModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        onSubmitted={() => {
          reportService.invalidateCache();
          refreshData(true);
        }}
      />
    </motion.div>
  );
}
