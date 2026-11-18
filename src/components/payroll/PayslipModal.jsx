"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Printer, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function PayslipModal({ isOpen, onClose, payslip, runInfo }) {
  if (!isOpen || !payslip) return null;

  const handlePrint = () => {
    window.print();
  };

  const basic = payslip.basicSalary ?? (payslip.totalGross || 0) / 1.5;
  const hra = payslip.hra ?? basic * 0.4;
  const medical = payslip.medical ?? basic * 0.1;
  const utilities = payslip.utilities ?? 0;
  const transport = payslip.transportAllowance ?? 0;
  const shiftAllow = payslip.shiftAllowance ?? 0;
  const otPay = payslip.overtimePay ?? 0;
  const otHours = payslip.overtimeHours ?? 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Earnings Statement (Payslip)"
      description={`Pay Period: ${runInfo?.period || "Active Cycle"} • Settlement: ${runInfo?.payDate || "Current"}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-xs">
        {/* Company & Employee Header */}
        <div className="flex items-start justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100">
              <Building2 className="w-4 h-4 text-indigo-500" />
              HCM Lite Corporation
            </div>
            <p className="text-zinc-400">100 Market St, Suite 400, San Francisco, CA</p>
            <div className="flex items-center gap-2 pt-0.5">
              <Badge variant="info" size="sm">Method: {payslip.calculationMethod || "WorkingDays"}</Badge>
              {runInfo?.status && (
                <Badge variant={runInfo.status === "Finalized" ? "success" : "warning"} size="sm">
                  {runInfo.status}
                </Badge>
              )}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {payslip.employeeName}
            </div>
            <p className="text-zinc-400">{payslip.jobTitle} • {payslip.department}</p>
            <p className="text-zinc-400 font-mono">ID: {payslip.employeeId}</p>
          </div>
        </div>

        {/* Earnings & Deductions Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2.5">
            <h4 className="font-semibold uppercase tracking-wider text-zinc-400 text-[11px]">
              Earnings & Allowances (Tab 10 & Tab 05)
            </h4>
            <div className="space-y-1.5">
              <div className="flex justify-between py-0.5">
                <span className="text-zinc-400">Basic Salary</span>
                <span className="font-mono font-medium">{formatCurrency(basic)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-zinc-400">House Rent Allowance (HRA)</span>
                <span className="font-mono font-medium">{formatCurrency(hra)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-zinc-400">Medical Allowance</span>
                <span className="font-mono font-medium">{formatCurrency(medical)}</span>
              </div>
              {utilities > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-zinc-400">Utilities Allowance</span>
                  <span className="font-mono font-medium">{formatCurrency(utilities)}</span>
                </div>
              )}
              {transport > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-zinc-400">Transport Allowance</span>
                  <span className="font-mono font-medium">{formatCurrency(transport)}</span>
                </div>
              )}
              {shiftAllow > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-zinc-400">Shift Allowance (Tab 06)</span>
                  <span className="font-mono text-cyan-400">{formatCurrency(shiftAllow)}</span>
                </div>
              )}
              {otPay > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-emerald-400">Overtime ({otHours} hrs)</span>
                  <span className="font-mono text-emerald-400">+{formatCurrency(otPay)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 font-semibold text-zinc-900 dark:text-zinc-100 pt-1.5 border-t border-zinc-800">
                <span>Total Gross Earnings</span>
                <span className="font-mono text-indigo-400">{formatCurrency(payslip.totalGross)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2.5">
            <h4 className="font-semibold uppercase tracking-wider text-zinc-400 text-[11px]">
              Deductions, Penalties & Tax
            </h4>
            <div className="space-y-1.5">
              <div className="flex justify-between py-0.5">
                <span className="text-zinc-400">
                  Attendance / Late Penalty ({payslip.lateCount || 0} lates)
                </span>
                <span className="font-mono text-rose-400">-{formatCurrency(payslip.attendanceDeduction || 0)}</span>
              </div>
              {payslip.pfDeduction > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-zinc-400">Provident Fund / 401k</span>
                  <span className="font-mono text-rose-400">-{formatCurrency(payslip.pfDeduction)}</span>
                </div>
              )}
              {payslip.eobiDeduction > 0 && (
                <div className="flex justify-between py-0.5">
                  <span className="text-zinc-400">EOBI / Insurance</span>
                  <span className="font-mono text-rose-400">-{formatCurrency(payslip.eobiDeduction)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5">
                <span className="text-zinc-400">Annualized Income Tax</span>
                <span className="font-mono">-{formatCurrency(payslip.tax ?? payslip.totalTaxes ?? 0)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-zinc-400">Per-Day Rate ({payslip.workingDays || 22}d basis)</span>
                <span className="font-mono text-zinc-400">
                  {formatCurrency(payslip.perDayDeduction || (payslip.totalGross || 0) / 22)}/day
                </span>
              </div>
              <div className="flex justify-between py-1 font-semibold text-zinc-900 dark:text-zinc-100 pt-1.5 border-t border-zinc-800">
                <span>Total Deductions</span>
                <span className="font-mono text-rose-400">-{formatCurrency(payslip.totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Pay Callout */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold">Net Take-Home Distribution</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {payslip.bankDetails?.bankName || "Direct Deposit"} ({payslip.bankDetails?.accountNumber || "•••• 4481"})
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {formatCurrency(payslip.netPay)}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="outline" size="sm" icon={Printer} onClick={handlePrint}>
            Print / Save PDF
          </Button>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
