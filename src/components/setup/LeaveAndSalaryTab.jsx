"use client";

import React, { useState, useEffect } from "react";
import { CalendarDays, DollarSign, Save } from "lucide-react";
import { hcmConfigService } from "@/services/hcmConfigService";
import { useNotification } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";

export function LeavePolicyTab({ config, onConfigUpdated, actorName = "Sarah Connor" }) {
  const { notifySuccess, notifyError } = useNotification();
  const [lp, setLp] = useState(config?.leavePolicy || {});
  const [blackoutInput, setBlackoutInput] = useState((config?.leavePolicy?.blackoutDates || []).join(", "));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLp(config?.leavePolicy || {});
    setBlackoutInput((config?.leavePolicy?.blackoutDates || []).join(", "));
  }, [config]);

  const updateLeaveTypeQuota = (code, quotaVal) => {
    const nextTypes = (lp.leaveTypes || []).map((t) =>
      t.code === code ? { ...t, quota: Number(quotaVal || 0) } : t
    );
    setLp({ ...lp, leaveTypes: nextTypes });
  };

  const toggleLeaveTypeField = (code, field) => {
    const nextTypes = (lp.leaveTypes || []).map((t) =>
      t.code === code ? { ...t, [field]: !t[field] } : t
    );
    setLp({ ...lp, leaveTypes: nextTypes });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const blackoutDates = blackoutInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));

      const updated = await hcmConfigService.updateSection(
        "leavePolicy",
        {
          ...lp,
          carryForwardMaxDays: Number(lp.carryForwardMaxDays || 5),
          minNoticeDays: Number(lp.minNoticeDays || 1),
          medicalCertAfterDays: Number(lp.medicalCertAfterDays || 2),
          backDatedLimitDays: Number(lp.backDatedLimitDays || 7),
          blackoutDates,
        },
        {
          actor: actorName,
          module: "Annual Leave Policy",
          action: "Updated Annual Leave Quotas & Rules",
          target: `Accrual: ${lp.accrualMethod} • Sandwich: ${lp.sandwichRuleApplied ? "ON" : "OFF"} • Blackouts: ${blackoutDates.length}`,
        }
      );
      onConfigUpdated?.(updated);
      notifySuccess("Leave Policy Saved", "Statutory quotas, carry-forward, and blackout dates updated.");
    } catch (err) {
      notifyError("Save Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-indigo-400" />
          Tab 09 — Annual Leave Policy & Statutory Quotas (12 Leave Types)
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1">
          Configure leave accrual, probation rules, medical certificate thresholds, carry-forward caps, sandwich rules, and blackout dates.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Select
              label="Accrual Method"
              options={["Upfront", "Monthly", "AfterProbation"]}
              value={lp.accrualMethod || "Upfront"}
              onChange={(e) => setLp({ ...lp, accrualMethod: e.target.value })}
            />
            <Input
              label="Max Carry Forward (Days)"
              type="number"
              value={lp.carryForwardMaxDays ?? 5}
              onChange={(e) => setLp({ ...lp, carryForwardMaxDays: e.target.value })}
            />
            <Input
              label="Min Notice (Annual Days)"
              type="number"
              value={lp.minNoticeDays ?? 1}
              onChange={(e) => setLp({ ...lp, minNoticeDays: e.target.value })}
            />
            <Input
              label="Medical Doc Required After (Days)"
              type="number"
              value={lp.medicalCertAfterDays ?? 2}
              onChange={(e) => setLp({ ...lp, medicalCertAfterDays: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Back-Dated Leave Limit (Days)"
              type="number"
              value={lp.backDatedLimitDays ?? 7}
              onChange={(e) => setLp({ ...lp, backDatedLimitDays: e.target.value })}
            />
            <Input
              label="Blackout Dates (YYYY-MM-DD, comma-separated)"
              value={blackoutInput}
              onChange={(e) => setBlackoutInput(e.target.value)}
              placeholder="2026-12-30, 2026-12-31"
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(lp.sandwichRuleApplied)}
                onChange={(e) => setLp({ ...lp, sandwichRuleApplied: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Apply Sandwich Rule (Count sandwiched weekends/holidays inside leave span)
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(lp.negativeBalanceAllowed)}
                onChange={(e) => setLp({ ...lp, negativeBalanceAllowed: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Allow Negative Balance Overdraft
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Annual Quota (Days)</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Allowed in Probation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lp.leaveTypes || []).map((lt) => (
                  <TableRow key={lt.code}>
                    <TableCell>
                      <div className="font-semibold text-zinc-100">{lt.name}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{lt.code}</div>
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        aria-label={`${lt.name} annual quota`}
                        value={lt.quota}
                        onChange={(e) => updateLeaveTypeQuota(lt.code, e.target.value)}
                        className="w-24 rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs font-mono text-zinc-100"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleLeaveTypeField(lt.code, "paid")}
                        className="text-xs"
                      >
                        <Badge variant={lt.paid ? "success" : "neutral"} size="sm">
                          {lt.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleLeaveTypeField(lt.code, "carryForward")}
                        className="text-xs"
                      >
                        <Badge variant={lt.carryForward ? "info" : "neutral"} size="sm">
                          {lt.carryForward ? "Yes" : "No"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleLeaveTypeField(lt.code, "probationAllowed")}
                        className="text-xs"
                      >
                        <Badge variant={lt.probationAllowed ? "success" : "warning"} size="sm">
                          {lt.probationAllowed ? "Allowed" : "Blocked"}
                        </Badge>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" icon={Save} isLoading={saving}>
              Save Annual Leave Policy
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SalarySetupTab({ config, onConfigUpdated, actorName = "Sarah Connor" }) {
  const { notifySuccess, notifyError } = useNotification();
  const [sal, setSal] = useState(config?.salarySetup || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSal(config?.salarySetup || {});
  }, [config]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await hcmConfigService.updateSection(
        "salarySetup",
        {
          ...sal,
          fixedDaysCount: Number(sal.fixedDaysCount || 22),
          hraPercentOfBasic: Number(sal.hraPercentOfBasic || 40),
          medicalPercentOfBasic: Number(sal.medicalPercentOfBasic || 10),
          utilitiesPercentOfBasic: Number(sal.utilitiesPercentOfBasic || 0),
          transportAllowanceFixed: Number(sal.transportAllowanceFixed || 0),
          pfPercent: Number(sal.pfPercent || 0),
          eobiFixed: Number(sal.eobiFixed || 0),
          paymentCycleStartDay: Number(sal.paymentCycleStartDay || 1),
        },
        {
          actor: actorName,
          module: "Salary Setup (Tab 10)",
          action: "Updated Payroll Salary Formula & Deductions",
          target: `Method: ${sal.calculationMethod} • HRA ${sal.hraPercentOfBasic}% • PF ${sal.pfPercent}%`,
        }
      );
      onConfigUpdated?.(updated);
      notifySuccess("Salary Setup Saved", "Payroll calculation method, allowances, and statutory deductions updated.");
    } catch (err) {
      notifyError("Save Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Tab 10 (Extra) — Salary Setup & Payroll Calculation Rules
        </CardTitle>
        <p className="text-xs text-zinc-400 mt-1">
          Configure how daily wage, allowances (HRA, Medical, Utilities, Transport), PF/EOBI, pro-rata joiners, and rounding flow into Payroll Runs.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Per-Day Wage Calculation Method"
              options={[
                { value: "WorkingDays", label: "Working Days (Default 22 days)" },
                { value: "CalendarDays", label: "Actual Calendar Days (28–31)" },
                { value: "Fixed30", label: "Fixed 30 Days / Month" },
                { value: "Fixed26", label: "Fixed 26 Days / Month" },
                { value: "Yearly365", label: "Annualized (Salary × 12 / 365)" },
              ]}
              value={sal.calculationMethod || "WorkingDays"}
              onChange={(e) => setSal({ ...sal, calculationMethod: e.target.value })}
            />
            <Select
              label="Absence / Late Deduction Base"
              options={[
                { value: "Gross", label: "Deduct from Gross Salary" },
                { value: "Basic", label: "Deduct from Basic Salary" },
              ]}
              value={sal.deductionBase || "Gross"}
              onChange={(e) => setSal({ ...sal, deductionBase: e.target.value })}
            />
            <Select
              label="Net Salary Rounding"
              options={[
                { value: "Nearest", label: "Standard (Nearest Dollar/Rupee)" },
                { value: "Floor", label: "Round Down (Floor)" },
                { value: "Ceil", label: "Round Up (Ceil)" },
              ]}
              value={sal.roundingMode || "Nearest"}
              onChange={(e) => setSal({ ...sal, roundingMode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="HRA (% of Basic)"
              type="number"
              value={sal.hraPercentOfBasic ?? 40}
              onChange={(e) => setSal({ ...sal, hraPercentOfBasic: e.target.value })}
            />
            <Input
              label="Medical (% of Basic)"
              type="number"
              value={sal.medicalPercentOfBasic ?? 10}
              onChange={(e) => setSal({ ...sal, medicalPercentOfBasic: e.target.value })}
            />
            <Input
              label="Utilities (% of Basic)"
              type="number"
              value={sal.utilitiesPercentOfBasic ?? 0}
              onChange={(e) => setSal({ ...sal, utilitiesPercentOfBasic: e.target.value })}
            />
            <Input
              label="Fixed Transport ($/mo)"
              type="number"
              value={sal.transportAllowanceFixed ?? 0}
              onChange={(e) => setSal({ ...sal, transportAllowanceFixed: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Provident Fund / 401k (% of Basic)"
              type="number"
              step="0.5"
              value={sal.pfPercent ?? 0}
              onChange={(e) => setSal({ ...sal, pfPercent: e.target.value })}
            />
            <Input
              label="EOBI / Fixed Insurance ($/mo)"
              type="number"
              value={sal.eobiFixed ?? 0}
              onChange={(e) => setSal({ ...sal, eobiFixed: e.target.value })}
            />
            <Input
              label="Payroll Cut-Off Start Day"
              type="number"
              min="1"
              max="28"
              value={sal.paymentCycleStartDay ?? 1}
              onChange={(e) => setSal({ ...sal, paymentCycleStartDay: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(sal.proRataJoinerLeaver)}
                onChange={(e) => setSal({ ...sal, proRataJoinerLeaver: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Pro-Rata Salary for Mid-Month Joiners & Leavers
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(sal.paidWeeklyOffs)}
                onChange={(e) => setSal({ ...sal, paidWeeklyOffs: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Paid Weekly Offs & Public Holidays
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <Button type="submit" icon={Save} isLoading={saving}>
              Save Salary Setup
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
