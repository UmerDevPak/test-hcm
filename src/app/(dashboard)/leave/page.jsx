"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { containerStagger, itemFadeUp, scrollViewport } from "@/lib/animationVariants";
import confetti from "canvas-confetti";
import {
  Plus,
  Check,
  X,
  Trash2,
  SlidersHorizontal,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { leaveService } from "@/services/leaveService";
import { hcmConfigService } from "@/services/hcmConfigService";
import { reportService } from "@/services/reportService";
import { LEAVE_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { LeaveRequestModal } from "@/components/leave/LeaveRequestModal";
import { LeaveBalanceAdjustModal } from "@/components/leave/LeaveBalanceAdjustModal";

export default function LeavePage() {
  const { user, isHR, isAdmin, isManager } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const canReview = isHR || isAdmin || isManager;
  const employeeId = user?.employeeId || "EMP-001";

  const [requests, setRequests] = useState(
    () => leaveService.peekCachedRequests(canReview ? {} : { employeeId }) || []
  );
  const [balances, setBalances] = useState(
    () => leaveService.peekCachedBalances(employeeId)
  );
  const [config, setConfig] = useState(
    () => hcmConfigService.peekCachedConfig()
  );
  const [activeTab, setActiveTab] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);

  const loadData = async (force = false) => {
    const [allReqs, empBalances, cfg] = await Promise.all([
      leaveService.getAllRequests(canReview ? {} : { employeeId }, force),
      leaveService.getEmployeeBalances(employeeId),
      hcmConfigService.getConfig(force),
    ]);
    setRequests(allReqs);
    setBalances(empBalances);
    setConfig(cfg);
  };

  useEffect(() => {
    loadData();

    const handleConfigChange = () => {
      loadData(false);
    };
    const handleLeavesChange = () => {
      loadData(false);
    };
    window.addEventListener("hcm_config_updated", handleConfigChange);
    window.addEventListener("hcm_leaves_updated", handleLeavesChange);
    return () => {
      window.removeEventListener("hcm_config_updated", handleConfigChange);
      window.removeEventListener("hcm_leaves_updated", handleLeavesChange);
    };
  }, [employeeId, canReview]);

  const handleReview = async (id, newStatus) => {
    if (!canReview) return;
    // 1. Optimistic instant UI update (0ms)
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: newStatus,
              reviewedBy: user?.displayName || "Reviewer",
              reviewedAt: new Date().toISOString().split("T")[0],
            }
          : r
      )
    );

    if (newStatus === LEAVE_STATUS.APPROVED) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      notifySuccess("Leave Approved", "Employee balance updated automatically.");
    } else {
      notifySuccess("Leave Request Rejected", "Status updated.");
    }

    try {
      await leaveService.updateRequestStatus(id, newStatus, user?.displayName || "Reviewer");
      reportService.invalidateCache();
      loadData(false);
    } catch (err) {
      notifyError("Failed to update leave", err.message);
      loadData(true);
    }
  };

  const handleDeleteLeave = async (id, empName) => {
    // 1. Optimistic instant UI update (0ms)
    setRequests((prev) => prev.filter((r) => r.id !== id));
    notifySuccess("Leave Record Removed", `Leave request for ${empName} was removed.`);

    try {
      await leaveService.deleteRequest(id);
      reportService.invalidateCache();
      loadData(false);
    } catch (err) {
      notifyError("Failed to remove leave", err.message);
      loadData(true);
    }
  };

  const leaveTypesCfg = config?.leavePolicy?.leaveTypes || [];
  const annualQuota = leaveTypesCfg.find((t) => t.code === "Annual")?.quota ?? 14;
  const sickQuota = leaveTypesCfg.find((t) => t.code === "Sick")?.quota ?? 8;
  const casualQuota = leaveTypesCfg.find((t) => t.code === "Casual")?.quota ?? 10;

  const todayIso = new Date().toISOString().split("T")[0];
  const upcomingHolidays = (config?.holidays || [])
    .filter((h) => h.date >= todayIso)
    .slice(0, 4);

  const filteredRequests = requests.filter((r) => {
    if (activeTab === "ALL") return true;
    return r.status.toUpperCase() === activeTab;
  });

  const tabs = [
    { id: "ALL", label: "All Requests", count: requests.length },
    {
      id: "PENDING",
      label: "Pending Review",
      count: requests.filter((r) => r.status === LEAVE_STATUS.PENDING).length,
    },
    {
      id: "APPROVED",
      label: "Approved",
      count: requests.filter((r) => r.status === LEAVE_STATUS.APPROVED).length,
    },
    {
      id: "REJECTED",
      label: "Rejected",
      count: requests.filter((r) => r.status === LEAVE_STATUS.REJECTED).length,
    },
  ];

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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Leave & Absence Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Tab 09 statutory quotas (12 leave types), live holiday/sandwich validation, and audited balance adjustments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(isHR || isAdmin) && (
            <Button
              size="sm"
              variant="outline"
              icon={SlidersHorizontal}
              onClick={() => setIsAdjustModalOpen(true)}
            >
              Adjust Leave Balance
            </Button>
          )}
          <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Request Time Off
          </Button>
        </div>
      </motion.div>

      {/* Balance Cards driven by Tab 09 Policy Quotas */}
      <motion.div variants={containerStagger} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          variants={itemFadeUp}
          whileHover={{ y: -4, transition: { duration: 0.16 } }}
          whileTap={{ scale: 0.985 }}
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/70 shadow-sm hover:border-indigo-500/40 transition-colors space-y-2"
        >
          <div className="text-xs font-medium text-zinc-400">Annual Leave</div>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {balances?.annual ?? annualQuota}{" "}
            <span className="text-xs font-normal text-zinc-400">/ {annualQuota} days left</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(
                  100,
                  Math.round(((balances?.annual ?? annualQuota) / (annualQuota || 1)) * 100)
                )}%`,
              }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
            />
          </div>
          <p className="text-[11px] text-zinc-500 pt-1">
            Carry-forward cap: {config?.leavePolicy?.carryForwardMaxDays ?? 5} days
          </p>
        </motion.div>

        <motion.div
          variants={itemFadeUp}
          whileHover={{ y: -4, transition: { duration: 0.16 } }}
          whileTap={{ scale: 0.985 }}
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/70 shadow-sm hover:border-emerald-500/40 transition-colors space-y-2"
        >
          <div className="text-xs font-medium text-zinc-400">Sick Leave</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {balances?.sick ?? sickQuota}{" "}
            <span className="text-xs font-normal text-zinc-400">/ {sickQuota} days left</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(
                  100,
                  Math.round(((balances?.sick ?? sickQuota) / (sickQuota || 1)) * 100)
                )}%`,
              }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            />
          </div>
          <p className="text-[11px] text-zinc-500 pt-1">
            Medical cert after {config?.leavePolicy?.medicalCertAfterDays ?? 2} consecutive days
          </p>
        </motion.div>

        <motion.div
          variants={itemFadeUp}
          whileHover={{ y: -4, transition: { duration: 0.16 } }}
          whileTap={{ scale: 0.985 }}
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/70 shadow-sm hover:border-amber-500/40 transition-colors space-y-2"
        >
          <div className="text-xs font-medium text-zinc-400">Casual Leave</div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {balances?.casual ?? casualQuota}{" "}
            <span className="text-xs font-normal text-zinc-400">/ {casualQuota} days left</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(
                  100,
                  Math.round(((balances?.casual ?? casualQuota) / (casualQuota || 1)) * 100)
                )}%`,
              }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
            />
          </div>
          <p className="text-[11px] text-zinc-500 pt-1">
            Sandwich Rule: {config?.leavePolicy?.sandwichRuleApplied ? "Active" : "Disabled"}
          </p>
        </motion.div>
      </motion.div>

      {/* Upcoming Public Holidays Strip */}
      {upcomingHolidays.length > 0 && (
        <motion.div variants={itemFadeUp}>
          <Card className="p-3.5 border-indigo-500/20 bg-white dark:bg-zinc-900/60 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300 font-semibold">
                <Calendar className="w-4 h-4" />
                <span>Configured Public Holidays (Auto-Skipped in Leave Days):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {upcomingHolidays.map((h) => (
                  <Badge key={h.id} variant="info" size="sm">
                    {h.name} • {h.date}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Requests Tabs & Table */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
        className="space-y-4"
      >
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <Card className="overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="p-8 sm:p-12">
              <EmptyState
                title="No Leave Requests"
                description={
                  activeTab === "PENDING"
                    ? "All leave requests have been reviewed. Inbox zero reached!"
                    : "No leave records found under this filter."
                }
                actionLabel="Request Time Off"
                actionIcon={Plus}
                onAction={() => setIsModalOpen(true)}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right min-w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={req.employeeName} size="sm" />
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {req.employeeName}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">{req.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                        {req.leaveType}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">
                        {formatDate(req.startDate)} → {formatDate(req.endDate)}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-zinc-900 dark:text-zinc-200">
                        {req.daysCount} d
                      </TableCell>
                      <TableCell className="text-zinc-400 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === LEAVE_STATUS.APPROVED
                              ? "success"
                              : req.status === LEAVE_STATUS.PENDING
                              ? "warning"
                              : "danger"
                          }
                          dot
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {req.status === LEAVE_STATUS.PENDING && canReview ? (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                icon={Check}
                                isLoading={loadingAction === req.id}
                                onClick={() => handleReview(req.id, LEAVE_STATUS.APPROVED)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                icon={X}
                                isLoading={loadingAction === req.id}
                                onClick={() => handleReview(req.id, LEAVE_STATUS.REJECTED)}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <span className="text-[11px] text-zinc-400 font-medium">
                              {req.reviewedBy
                                ? `Signed by ${req.reviewedBy}`
                                : req.status === LEAVE_STATUS.PENDING
                                ? "Awaiting HR"
                                : "Completed"}
                            </span>
                          )}

                          {(canReview || req.status === LEAVE_STATUS.PENDING) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLeave(req.id, req.employeeName)}
                              title="Withdraw / Delete leave record"
                              disabled={loadingAction === req.id}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </motion.div>

      <LeaveRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitted={() => {
          reportService.invalidateCache();
          loadData(true);
        }}
      />

      <LeaveBalanceAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onAdjusted={() => {
          reportService.invalidateCache();
          loadData(true);
        }}
      />
    </motion.div>
  );
}
