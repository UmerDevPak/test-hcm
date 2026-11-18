"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { containerStagger, itemFadeUp, scrollViewport } from "@/lib/animationVariants";
import {
  CreditCard,
  Plus,
  Download,
  Eye,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  PieChart,
  Lock,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { payrollService } from "@/services/payrollService";
import { employeeService } from "@/services/employeeService";
import { hcmConfigService } from "@/services/hcmConfigService";
import { reportService } from "@/services/reportService";
import { formatCurrency, formatDate, exportToCSV } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RunPayrollModal } from "@/components/payroll/RunPayrollModal";
import { PayslipModal } from "@/components/payroll/PayslipModal";

export default function PayrollPage() {
  const { user, isAdmin, isHR, loading: authLoading } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  const [runs, setRuns] = useState(() => payrollService.peekCachedPayrollRuns() || []);
  const [personalLatestPayslip, setPersonalLatestPayslip] = useState(null);
  const [salaryMethod, setSalaryMethod] = useState("WorkingDays");
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedRunInfo, setSelectedRunInfo] = useState(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const isManagement = isAdmin || isHR;
  const actorName = user?.displayName || (isAdmin ? "Sarah Connor" : "Aaliyah Patel");

  const fetchPayroll = async (force = false) => {
    const [allRuns, cfg] = await Promise.all([
      payrollService.getAllPayrollRuns(force),
      hcmConfigService.getConfig(force),
    ]);
    setRuns(allRuns);
    setSalaryMethod(cfg?.salarySetup?.calculationMethod || "WorkingDays");

    if (!isManagement && user) {
      const emp = await employeeService.getEmployeeById(user?.employeeId || "EMP-003");
      const breakdown = await payrollService.calculateEmployeePayroll(
        emp || { id: user?.employeeId || "EMP-003", annualSalary: 145000 }
      );
      setPersonalLatestPayslip({
        employeeId: emp?.id || user?.employeeId || "EMP-003",
        employeeName: emp?.name || user?.displayName,
        jobTitle: emp?.jobTitle || user?.jobTitle || "Team Member",
        department: emp?.department || user?.department || "Engineering",
        bankDetails: emp?.bankDetails,
        ...breakdown,
      });
    }
  };

  useEffect(() => {
    fetchPayroll();

    const handleConfigChange = () => {
      fetchPayroll(true);
    };
    window.addEventListener("hcm_config_updated", handleConfigChange);
    return () => window.removeEventListener("hcm_config_updated", handleConfigChange);
  }, [user, isManagement]);

  if (!authLoading && !user) {
    return null;
  }

  const visibleRuns = isManagement
    ? runs
    : runs.filter((r) => r.status === "Finalized" || r.status === "Completed");

  const resolveEmployeePayslipForRun = async (run) => {
    const match = (run.payslips || []).find((p) => p.employeeId === user?.employeeId);
    if (match) return match;
    if (isManagement && run.payslips?.length > 0) return run.payslips[0];
    if (personalLatestPayslip) return personalLatestPayslip;
    const emp = await employeeService.getEmployeeById(user?.employeeId || "EMP-003");
    const breakdown = await payrollService.calculateEmployeePayroll(emp || { annualSalary: 145000 });
    return {
      employeeId: emp?.id || user?.employeeId || "EMP-003",
      employeeName: emp?.name || user?.displayName || "Employee",
      jobTitle: emp?.jobTitle || "Team Member",
      department: emp?.department || "Engineering",
      bankDetails: emp?.bankDetails,
      ...breakdown,
    };
  };

  const handleInspectPayslip = async (run) => {
    const payslip = await resolveEmployeePayslipForRun(run);
    setSelectedPayslip(payslip);
    setSelectedRunInfo(run);
    setIsPayslipModalOpen(true);
  };

  const handleFinalizeRun = async (run) => {
    setBusyId(run.id);
    try {
      await payrollService.finalizePayrollRun(run.id, actorName);
      reportService.invalidateCache();
      await fetchPayroll(true);
      notifySuccess(
        "Payroll Finalized & Locked",
        `Batch ${run.id} is permanently locked and attendance up to ${run.periodEnd || run.payDate} is frozen.`
      );
    } catch (err) {
      notifyError("Finalization Failed", err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteDraft = async (run) => {
    setBusyId(run.id);
    try {
      await payrollService.deletePayrollRun(run.id, actorName);
      reportService.invalidateCache();
      await fetchPayroll(true);
      notifyInfo("Draft Deleted", `Payroll draft ${run.id} removed.`);
    } catch (err) {
      notifyError("Delete Failed", err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleExportPayroll = (run) => {
    exportToCSV(`payroll-run-${run.id}`, [run], {
      id: "Batch ID",
      period: "Pay Period",
      payDate: "Disbursement Date",
      status: "Status",
      totalGross: "Total Gross ($)",
      totalTaxes: "Total Taxes ($)",
      totalDeductions: "Total Deductions ($)",
      totalNet: "Net Disbursed ($)",
      employeeCount: "Headcount",
      processedBy: "Processed By",
    });
    notifySuccess("Export Ready", `Exported direct deposit file for batch ${run.id}.`);
  };

  const latestVisible = visibleRuns[0];
  const myFirstRunSlip =
    latestVisible?.payslips?.find((p) => p.employeeId === user?.employeeId) ||
    personalLatestPayslip;

  const latestGross = isManagement
    ? latestVisible?.totalGross || 48250
    : myFirstRunSlip?.totalGross || 0;
  const latestNet = isManagement
    ? latestVisible?.totalNet || 35120.45
    : myFirstRunSlip?.netPay || 0;
  const latestTaxes = isManagement
    ? latestVisible?.totalTaxes || 10425.3
    : myFirstRunSlip?.tax ?? myFirstRunSlip?.totalTaxes ?? 0;
  const latestDeductions = isManagement
    ? latestVisible?.totalDeductions || Math.max(0, latestGross - latestNet - latestTaxes)
    : Math.max(0, (myFirstRunSlip?.totalDeductions || 0) - latestTaxes);

  const denom = latestGross || 1;
  const netPercent = Math.round((latestNet / denom) * 100);
  const taxPercent = Math.round((latestTaxes / denom) * 100);
  const deductPercent = Math.max(0, 100 - netPercent - taxPercent);

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
              {isManagement ? "Payroll Processing & Direct Deposit" : "My Finalized Payslips & Earnings"}
            </h1>
            <Badge variant="info" size="sm">Tab 10 Basis: {salaryMethod}</Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isAdmin
              ? "Execute, finalize, and permanently lock monthly payroll batches using Tab 10 formulas & OT/Late telemetry."
              : isHR
              ? "Prepare monthly payroll drafts with Overtime & Late deductions for Admin finalization."
              : "View official finalized pay vouchers, allowances, overtime payouts, and tax withholdings."}
          </p>
        </div>

        {isManagement && (
          <Button size="sm" icon={Plus} onClick={() => setIsRunModalOpen(true)}>
            {isAdmin ? "Execute Payroll Batch" : "Prepare Payroll Draft"}
          </Button>
        )}
      </motion.div>

      {/* KPI Stats */}
      <motion.div
        variants={containerStagger}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemFadeUp}>
          <StatCard
            title={isManagement ? "Latest Batch Net" : "My Latest Net Paycheck"}
            value={formatCurrency(latestNet)}
            subtext={`Gross: ${formatCurrency(latestGross)}`}
            icon={CreditCard}
            iconColor="text-indigo-400"
            iconBg="bg-indigo-500/10"
          />
        </motion.div>

        <motion.div variants={itemFadeUp}>
          <StatCard
            title="Withholding & Taxes"
            value={formatCurrency(latestTaxes)}
            subtext="Annualized income tax"
            icon={DollarSign}
            iconColor="text-rose-400"
            iconBg="bg-rose-500/10"
          />
        </motion.div>

        <motion.div variants={itemFadeUp}>
          <StatCard
            title={isManagement ? "Payroll Batches" : "Finalized Statements"}
            value={visibleRuns.length}
            subtext={
              isManagement
                ? `${visibleRuns.filter((r) => r.status === "Draft").length} Draft • ${
                    visibleRuns.filter((r) => r.isLocked || r.status === "Finalized").length
                  } Locked`
                : "Verified & Disbursed"
            }
            icon={CheckCircle2}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
          />
        </motion.div>

        <motion.div variants={itemFadeUp}>
          <StatCard
            title="Tab 10 Calculation Basis"
            value={salaryMethod}
            subtext="Synchronized with HCM Setup"
            icon={TrendingUp}
            iconColor="text-purple-400"
            iconBg="bg-purple-500/10"
          />
        </motion.div>
      </motion.div>

      {/* Gross-to-Net Capital Allocation Bar */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
        whileHover={{ y: -3, transition: { duration: 0.16 } }}
        className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
                {isManagement ? "Gross-to-Net Capital Distribution" : "My Earnings Breakdown"}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Take-home wages, annualized tax withholdings, and PF/late deductions.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-300">
            Total Gross: {formatCurrency(latestGross)}
          </span>
        </div>

        <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden flex gap-1 p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${netPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${taxPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400"
          />
          {deductPercent > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${deductPercent}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-400 text-[11px]">Net Take-Home:</span>
            <span className="font-mono font-semibold text-emerald-400">
              {formatCurrency(latestNet)} ({netPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-zinc-400 text-[11px]">Tax Withholding:</span>
            <span className="font-mono font-semibold text-rose-400">
              {formatCurrency(latestTaxes)} ({taxPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-zinc-400 text-[11px]">Attendance / PF Deductions:</span>
            <span className="font-mono font-semibold text-amber-400">
              {formatCurrency(latestDeductions)} ({deductPercent}%)
            </span>
          </div>
        </div>
      </motion.div>

      {/* Runs Table */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={scrollViewport}
        variants={itemFadeUp}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              {isManagement
                ? "Payroll Disbursal & Draft Batches"
                : "My Finalized Payslips & Compensation Ledger"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {visibleRuns.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={CreditCard}
                  title="No Finalized Payroll Records"
                  description={
                    isManagement
                      ? "No payroll batches found. Generate a new payroll run or draft to get started."
                      : "No finalized payslips have been published by Administration yet."
                  }
                  actionLabel={isManagement ? (isAdmin ? "Run Payroll Batch" : "Prepare Payroll Draft") : undefined}
                  onAction={isManagement ? () => setIsRunModalOpen(true) : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Pay Period</TableHead>
                      <TableHead>Settlement Date</TableHead>
                      {isManagement && <TableHead>Personnel</TableHead>}
                      <TableHead>{isManagement ? "Gross Wages" : "My Gross"}</TableHead>
                      <TableHead>{isManagement ? "Net Disbursed" : "My Net Pay"}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRuns.map((r) => {
                      const empSlip = !isManagement
                        ? r.payslips?.find((p) => p.employeeId === user?.employeeId) || personalLatestPayslip
                        : null;
                      const isLocked = Boolean(r.isLocked || r.status === "Finalized" || r.status === "Completed");

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                            {r.id}
                          </TableCell>
                          <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                            {r.period}
                          </TableCell>
                          <TableCell className="text-zinc-400 text-xs">
                            {formatDate(r.payDate)}
                          </TableCell>
                          {isManagement && (
                            <TableCell className="text-zinc-300">{r.employeeCount} active</TableCell>
                          )}
                          <TableCell className="font-mono font-medium text-zinc-300">
                            {formatCurrency(isManagement ? r.totalGross : empSlip?.totalGross || 0)}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-emerald-400">
                            {formatCurrency(isManagement ? r.totalNet : empSlip?.netPay || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isLocked ? "success" : "warning"} dot>
                              {isLocked ? "Finalized (Locked)" : r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={Eye}
                                onClick={() => handleInspectPayslip(r)}
                              >
                                Payslip
                              </Button>
                              {isManagement && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Download}
                                  onClick={() => handleExportPayroll(r)}
                                >
                                  Export CSV
                                </Button>
                              )}
                              {isAdmin && !isLocked && (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    icon={Lock}
                                    isLoading={busyId === r.id}
                                    onClick={() => handleFinalizeRun(r)}
                                  >
                                    Finalize & Lock
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDraft(r)}
                                    title="Delete Draft"
                                    disabled={busyId === r.id}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <RunPayrollModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        defaultMode={isAdmin ? "Finalized" : "Draft"}
        onCompleted={() => {
          reportService.invalidateCache();
          fetchPayroll(true);
        }}
      />

      <PayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        payslip={selectedPayslip}
        runInfo={selectedRunInfo}
      />
    </motion.div>
  );
}
