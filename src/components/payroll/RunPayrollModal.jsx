"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { payrollService } from "@/services/payrollService";
import { employeeService } from "@/services/employeeService";
import { hcmConfigService } from "@/services/hcmConfigService";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { normalizeRole } from "@/lib/constants";

export function RunPayrollModal({ isOpen, onClose, onCompleted, defaultMode = null }) {
  const { user, isAdmin } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const monthPrefix = today.toISOString().slice(0, 7);
  const [periodStart, setPeriodStart] = useState(`${monthPrefix}-01`);
  const [periodEnd, setPeriodEnd] = useState(`${monthPrefix}-30`);
  const [payDate, setPayDate] = useState(today.toISOString().split("T")[0]);
  const [mode, setMode] = useState(defaultMode || (isAdmin ? "Finalized" : "Draft"));
  const [staffCount, setStaffCount] = useState(8);
  const [salaryMethod, setSalaryMethod] = useState("WorkingDays");
  const [deductionBase, setDeductionBase] = useState("Gross");

  useEffect(() => {
    if (!isOpen) return;
    setMode(defaultMode || (isAdmin ? "Finalized" : "Draft"));
    Promise.all([employeeService.getAllEmployees(), hcmConfigService.getConfig()]).then(([emps, cfg]) => {
      setStaffCount(emps.length || 8);
      setSalaryMethod(cfg?.salarySetup?.calculationMethod || "WorkingDays");
      setDeductionBase(cfg?.salarySetup?.deductionBase || "Gross");
    });
  }, [isOpen, defaultMode, isAdmin]);

  const handleRun = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const employees = await employeeService.getAllEmployees();
      const actorRole = normalizeRole(user?.role);
      const effectiveMode = isAdmin ? mode : "Draft";

      const run = await payrollService.runPayroll({
        period: `${periodStart} to ${periodEnd}`,
        periodStart,
        periodEnd,
        payDate,
        processedBy: user?.displayName || "Sarah Connor",
        actorRole,
        mode: effectiveMode,
        employees,
      });

      if (effectiveMode === "Finalized") {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      notifySuccess(
        effectiveMode === "Finalized" ? "Payroll Finalized & Locked" : "Payroll Draft Prepared",
        effectiveMode === "Finalized"
          ? `Disbursed ${run.employeeCount} payslips and locked attendance up to ${periodEnd}.`
          : `Prepared draft for ${run.employeeCount} employees awaiting Admin finalization.`
      );
      onCompleted?.();
      onClose();
    } catch (err) {
      notifyError("Payroll execution failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdmin ? "Execute or Draft Payroll Batch" : "Prepare Monthly Payroll Draft"}
      description="Computes Basic, Allowances, Overtime (Tab 05), Late Penalties (Tab 04), and Tax Slabs using live Tab 10 Salary Setup."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleRun} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Period Start"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
          />
          <Input
            label="Period End"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Settlement Date"
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            required
          />
          {isAdmin ? (
            <Select
              label="Batch Action"
              options={[
                { value: "Finalized", label: "Finalize & Lock Period" },
                { value: "Draft", label: "Save as HR Draft" },
              ]}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            />
          ) : (
            <Input label="Batch Action" value="Draft (Pending Admin Lock)" disabled />
          )}
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Active Workforce</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-200">{staffCount} Personnel</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Tab 10 Calculation Method</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-300">{salaryMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Absence / Late Base</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300">{deductionBase} Salary</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Attendance Lock Rule</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {mode === "Finalized" && isAdmin
                ? `Locks Attendance <= ${periodEnd}`
                : "Unlocked while in Draft"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            {mode === "Finalized" && isAdmin ? "Execute & Lock Batch" : "Generate Payroll Draft"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
