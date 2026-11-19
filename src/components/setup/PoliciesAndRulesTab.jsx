"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Clock, Zap, AlertTriangle, Save } from "lucide-react";
import { hcmConfigService } from "@/services/hcmConfigService";
import { useNotification } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

const DAYS_LIST = [
  { val: 0, label: "Sun" },
  { val: 1, label: "Mon" },
  { val: 2, label: "Tue" },
  { val: 3, label: "Wed" },
  { val: 4, label: "Thu" },
  { val: 5, label: "Fri" },
  { val: 6, label: "Sat" },
];

export function AttendanceRuleTab({ config, onConfigUpdated, actorName = "Sarah Connor" }) {
  const { notifySuccess, notifyError } = useNotification();
  const [rule, setRule] = useState(config?.attendanceRule || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRule(config?.attendanceRule || {});
  }, [config]);

  const toggleOffDay = (dayVal) => {
    const current = Array.isArray(rule.weeklyOffDays) ? rule.weeklyOffDays : [0, 6];
    const next = current.includes(dayVal)
      ? current.filter((d) => d !== dayVal)
      : [...current, dayVal].sort();
    setRule({ ...rule, weeklyOffDays: next, workingDaysPerWeek: Math.max(1, 7 - next.length) });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await hcmConfigService.updateSection(
        "attendanceRule",
        {
          ...rule,
          fixedWorkingDaysCount: Number(rule.fixedWorkingDaysCount || 22),
          minHoursFullDay: Number(rule.minHoursFullDay || 8),
          minHoursHalfDay: Number(rule.minHoursHalfDay || 5),
          duplicatePunchGapMinutes: Number(rule.duplicatePunchGapMinutes || 5),
          breakMinutes: Number(rule.breakMinutes || 60),
          correctionWindowDays: Number(rule.correctionWindowDays || 7),
          payrollCycleStartDay: Number(rule.payrollCycleStartDay || 1),
        },
        {
          actor: actorName,
          module: "Attendance Rule",
          action: "Saved Master Attendance Rules",
          target: `${rule.workingDaysPerWeek}d/wk • Full ${rule.minHoursFullDay}h / Half ${rule.minHoursHalfDay}h • Dup Gap ${rule.duplicatePunchGapMinutes}m`,
        }
      );
      onConfigUpdated?.(updated);
      notifySuccess("Attendance Rules Saved", "Master attendance calculation rules are now live.");
    } catch (err) {
      notifyError("Save Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Tab 03 — Master Attendance Rule
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Configure weekly off days, alternate Saturdays, minimum shift hours, duplicate punch filter, and payroll attendance lock.
          </p>
        </div>
        {rule.attendanceLockedUpTo && (
          <Badge variant="warning" dot>Locked up to {rule.attendanceLockedUpTo}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">Weekly Off Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_LIST.map((d) => {
                const isOff = (rule.weeklyOffDays || []).includes(d.val);
                return (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => toggleOffDay(d.val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      isOff
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {d.label} {isOff ? "(OFF)" : "(Work)"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Alternate Saturdays Rule"
              options={[
                { value: "none", label: "Standard (Use Weekly Off)" },
                { value: "1st_3rd_off", label: "1st & 3rd Saturday OFF" },
                { value: "2nd_4th_off", label: "2nd & 4th Saturday OFF" },
              ]}
              value={rule.alternateSaturdays || "none"}
              onChange={(e) => setRule({ ...rule, alternateSaturdays: e.target.value })}
            />
            <Select
              label="Monthly Days Calculation"
              options={[
                { value: "WorkingDays", label: "Actual Working Days (Default 22)" },
                { value: "CalendarDays", label: "Calendar Days (28–31)" },
                { value: "FixedDays", label: "Fixed Days Count" },
              ]}
              value={rule.monthlyDaysMethod || "WorkingDays"}
              onChange={(e) => setRule({ ...rule, monthlyDaysMethod: e.target.value })}
            />
            <Input
              label="Day Cut-Off (Night Boundary)"
              type="time"
              value={rule.dayCutoffTime || "04:00"}
              onChange={(e) => setRule({ ...rule, dayCutoffTime: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="Min Hours (Full Day)"
              type="number"
              step="0.5"
              value={rule.minHoursFullDay ?? 8}
              onChange={(e) => setRule({ ...rule, minHoursFullDay: e.target.value })}
            />
            <Input
              label="Min Hours (Half Day)"
              type="number"
              step="0.5"
              value={rule.minHoursHalfDay ?? 5}
              onChange={(e) => setRule({ ...rule, minHoursHalfDay: e.target.value })}
            />
            <Input
              label="Duplicate Punch Gap (mins)"
              type="number"
              min="1"
              max="60"
              value={rule.duplicatePunchGapMinutes ?? 5}
              onChange={(e) => setRule({ ...rule, duplicatePunchGapMinutes: e.target.value })}
            />
            <Input
              label="Correction Window (days)"
              type="number"
              min="1"
              max="60"
              value={rule.correctionWindowDays ?? 7}
              onChange={(e) => setRule({ ...rule, correctionWindowDays: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Attendance Source Logic"
              options={[
                { value: "FirstInLastOut", label: "First-In & Last-Out (Standard)" },
                { value: "AllPairs", label: "All In/Out Pairs (Net Work Time)" },
              ]}
              value={rule.attendanceSource || "FirstInLastOut"}
              onChange={(e) => setRule({ ...rule, attendanceSource: e.target.value })}
            />
            <Select
              label="Missing Punch Fallback"
              options={[
                { value: "MarkMissingPunch", label: "Flag as Missing Punch" },
                { value: "AutoHalfDay", label: "Auto-Mark Half-Day" },
                { value: "AutoAbsent", label: "Auto-Mark Absent" },
              ]}
              value={rule.missingPunchRule || "MarkMissingPunch"}
              onChange={(e) => setRule({ ...rule, missingPunchRule: e.target.value })}
            />
            <Input
              label="Attendance Locked Up To"
              type="date"
              value={rule.attendanceLockedUpTo || ""}
              onChange={(e) => setRule({ ...rule, attendanceLockedUpTo: e.target.value })}
              helperText="Automatically set on Payroll Finalization"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(rule.allowEmployeeCorrection)}
                onChange={(e) => setRule({ ...rule, allowEmployeeCorrection: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Allow Employee Self-Service Corrections & WFH Requests
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(rule.breakPaid)}
                onChange={(e) => setRule({ ...rule, breakPaid: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Paid Meal / Tea Break ({rule.breakMinutes || 60} mins)
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <Button type="submit" icon={Save} isLoading={saving}>
              Save Attendance Rule
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function LatePolicyTab({ config, onConfigUpdated, actorName = "Sarah Connor" }) {
  const { notifySuccess, notifyError } = useNotification();
  const [policy, setPolicy] = useState(config?.latePolicy || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPolicy(config?.latePolicy || {});
  }, [config]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await hcmConfigService.updateSection(
        "latePolicy",
        {
          ...policy,
          graceMinutes: Number(policy.graceMinutes || 0),
          graceFrequencyPerMonth: Number(policy.graceFrequencyPerMonth || 3),
          frequencyPenaltyThreshold: Number(policy.frequencyPenaltyThreshold || 3),
          frequencyPenaltyDays: Number(policy.frequencyPenaltyDays || 0.5),
          fixedPenaltyAmount: Number(policy.fixedPenaltyAmount || 25),
          habitualLateAlertThreshold: Number(policy.habitualLateAlertThreshold || 3),
        },
        {
          actor: actorName,
          module: "Late Policy",
          action: "Updated Late Arrival Policy",
          target: `Grace ${policy.graceMinutes}m • ${policy.deductionMethod} • ${policy.frequencyPenaltyThreshold} lates = ${policy.frequencyPenaltyDays} day`,
        }
      );
      onConfigUpdated?.(updated);
      notifySuccess("Late Policy Updated", "Late arrival grace window and penalty rules saved.");
    } catch (err) {
      notifyError("Save Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Tab 04 — Late Arrival Policy
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Define grace minutes, deduction basis (Shift Start vs After Grace), frequency penalties (e.g., 3 lates = 0.5 day), and slab table.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(policy.enabled)}
                onChange={(e) => setPolicy({ ...policy, enabled: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Enable Late Policy Enforcement
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(policy.frequencyPenaltyEnabled)}
                onChange={(e) => setPolicy({ ...policy, frequencyPenaltyEnabled: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Enable Frequency Penalty (N lates = X day)
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Grace Minutes After Shift Start"
              type="number"
              min="0"
              max="120"
              value={policy.graceMinutes ?? 15}
              onChange={(e) => setPolicy({ ...policy, graceMinutes: e.target.value })}
            />
            <Select
              label="Count Late Minutes From"
              options={[
                { value: "AfterGrace", label: "After Grace Window Expires" },
                { value: "ShiftStart", label: "From Shift Start Time" },
              ]}
              value={policy.deductFrom || "AfterGrace"}
              onChange={(e) => setPolicy({ ...policy, deductFrom: e.target.value })}
            />
            <Select
              label="Deduction Method"
              options={[
                { value: "FrequencyPenalty", label: "Frequency Rule (N lates = X day)" },
                { value: "ActualMinutes", label: "Actual Late Minutes" },
                { value: "FullHour", label: "Full Hour Deduction per Late" },
                { value: "FixedAmount", label: "Fixed Amount per Late" },
              ]}
              value={policy.deductionMethod || "FrequencyPenalty"}
              onChange={(e) => setPolicy({ ...policy, deductionMethod: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="Frequency Threshold (Lates)"
              type="number"
              min="1"
              max="30"
              value={policy.frequencyPenaltyThreshold ?? 3}
              onChange={(e) => setPolicy({ ...policy, frequencyPenaltyThreshold: e.target.value })}
            />
            <Input
              label="Day Deduction per Block"
              type="number"
              step="0.25"
              min="0"
              max="5"
              value={policy.frequencyPenaltyDays ?? 0.5}
              onChange={(e) => setPolicy({ ...policy, frequencyPenaltyDays: e.target.value })}
            />
            <Input
              label="Fixed Penalty ($ / Late)"
              type="number"
              min="0"
              value={policy.fixedPenaltyAmount ?? 25}
              onChange={(e) => setPolicy({ ...policy, fixedPenaltyAmount: e.target.value })}
            />
            <Input
              label="HR Watchlist Alert Count"
              type="number"
              min="1"
              max="20"
              value={policy.habitualLateAlertThreshold ?? 3}
              onChange={(e) => setPolicy({ ...policy, habitualLateAlertThreshold: e.target.value })}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <Button type="submit" icon={Save} isLoading={saving}>
              Save Late Policy
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function OvertimePolicyTab({ config, onConfigUpdated, actorName = "Sarah Connor" }) {
  const { notifySuccess, notifyError } = useNotification();
  const [ot, setOt] = useState(config?.overtimePolicy || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOt(config?.overtimePolicy || {});
  }, [config]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await hcmConfigService.updateSection(
        "overtimePolicy",
        {
          ...ot,
          afterShiftBufferMinutes: Number(ot.afterShiftBufferMinutes || 30),
          minOtMinutes: Number(ot.minOtMinutes || 30),
          maxDailyOtHours: Number(ot.maxDailyOtHours || 4),
          maxMonthlyOtHours: Number(ot.maxMonthlyOtHours || 45),
          workingDayMultiplier: Number(ot.workingDayMultiplier || 1.5),
          weeklyOffMultiplier: Number(ot.weeklyOffMultiplier || 2.0),
          publicHolidayMultiplier: Number(ot.publicHolidayMultiplier || 2.0),
          nightOtMultiplier: Number(ot.nightOtMultiplier || 1.75),
          roundingMinutes: Number(ot.roundingMinutes || 15),
        },
        {
          actor: actorName,
          module: "Overtime Policy",
          action: "Updated Overtime Rules & Multipliers",
          target: `Working ${ot.workingDayMultiplier}x • Holiday ${ot.publicHolidayMultiplier}x • Cap ${ot.maxDailyOtHours}h/day`,
        }
      );
      onConfigUpdated?.(updated);
      notifySuccess("Overtime Policy Saved", "OT multipliers, buffers, and caps updated.");
    } catch (err) {
      notifyError("Save Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            Tab 05 — Overtime (OT) Policy
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Configure post-shift buffer, rounding, daily/monthly caps, multipliers (Working/Off/Holiday/Night), and Cash vs Comp-Off payout.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(ot.enabled)}
                onChange={(e) => setOt({ ...ot, enabled: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Enable Overtime Calculation
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(ot.netLateAgainstOt)}
                onChange={(e) => setOt({ ...ot, netLateAgainstOt: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Net Late Minutes Against Overtime First
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="After-Shift Buffer (mins)"
              type="number"
              value={ot.afterShiftBufferMinutes ?? 30}
              onChange={(e) => setOt({ ...ot, afterShiftBufferMinutes: e.target.value })}
            />
            <Input
              label="Min Eligible OT (mins)"
              type="number"
              value={ot.minOtMinutes ?? 30}
              onChange={(e) => setOt({ ...ot, minOtMinutes: e.target.value })}
            />
            <Input
              label="Daily OT Cap (hrs)"
              type="number"
              step="0.5"
              value={ot.maxDailyOtHours ?? 4}
              onChange={(e) => setOt({ ...ot, maxDailyOtHours: e.target.value })}
            />
            <Input
              label="Rounding Block (mins)"
              type="number"
              value={ot.roundingMinutes ?? 15}
              onChange={(e) => setOt({ ...ot, roundingMinutes: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="Working Day Multiplier (×)"
              type="number"
              step="0.25"
              value={ot.workingDayMultiplier ?? 1.5}
              onChange={(e) => setOt({ ...ot, workingDayMultiplier: e.target.value })}
            />
            <Input
              label="Weekly Off Multiplier (×)"
              type="number"
              step="0.25"
              value={ot.weeklyOffMultiplier ?? 2.0}
              onChange={(e) => setOt({ ...ot, weeklyOffMultiplier: e.target.value })}
            />
            <Input
              label="Public Holiday Multiplier (×)"
              type="number"
              step="0.25"
              value={ot.publicHolidayMultiplier ?? 2.0}
              onChange={(e) => setOt({ ...ot, publicHolidayMultiplier: e.target.value })}
            />
            <Input
              label="Night OT Multiplier (×)"
              type="number"
              step="0.25"
              value={ot.nightOtMultiplier ?? 1.75}
              onChange={(e) => setOt({ ...ot, nightOtMultiplier: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Hourly Rate Base"
              options={[
                { value: "Basic", label: "Basic Salary Base" },
                { value: "Gross", label: "Gross Salary Base" },
              ]}
              value={ot.rateBase || "Basic"}
              onChange={(e) => setOt({ ...ot, rateBase: e.target.value })}
            />
            <Select
              label="OT Compensation Mode"
              options={[
                { value: "Cash", label: "Cash Payout in Monthly Payroll" },
                { value: "CompOff", label: "Compensatory Leave Credit (Time-in-Lieu)" },
              ]}
              value={ot.compensationType || "Cash"}
              onChange={(e) => setOt({ ...ot, compensationType: e.target.value })}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <Button type="submit" icon={Save} isLoading={saving}>
              Save Overtime Policy
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function OffHalfDayTab({ config, onConfigUpdated, actorName = "Sarah Connor" }) {
  const { notifySuccess, notifyError } = useNotification();
  const [rule, setRule] = useState(config?.offHalfDayRule || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRule(config?.offHalfDayRule || {});
  }, [config]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await hcmConfigService.updateSection(
        "offHalfDayRule",
        {
          ...rule,
          lateHalfDayAfterMinutes: Number(rule.lateHalfDayAfterMinutes || 90),
          lateAbsentAfterMinutes: Number(rule.lateAbsentAfterMinutes || 240),
          earlyHalfDayBeforeMinutes: Number(rule.earlyHalfDayBeforeMinutes || 90),
          hoursBasedHalfDayMin: Number(rule.hoursBasedHalfDayMin || 5),
          hoursBasedAbsentMin: Number(rule.hoursBasedAbsentMin || 2),
          paidWeeklyOffRequiredPresentDays: Number(rule.paidWeeklyOffRequiredPresentDays || 2),
        },
        {
          actor: actorName,
          module: "OFF / Half Day Rules",
          action: "Updated Half-Day, Early Leave & Sandwich Rules",
          target: `Late Half-Day >${rule.lateHalfDayAfterMinutes}m • Sandwich ${rule.sandwichRuleEnabled ? "ON" : "OFF"}`,
        }
      );
      onConfigUpdated?.(updated);
      notifySuccess("OFF / Half-Day Rules Saved", "Thresholds and sandwich rules updated.");
    } catch (err) {
      notifyError("Save Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            Tab 07 — OFF / Half Day & Absence Thresholds
          </CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Define thresholds where severe lateness or short hours automatically convert to Half-Day or Absent, plus weekly-off & sandwich rules.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Late > (mins) = Half-Day"
              type="number"
              value={rule.lateHalfDayAfterMinutes ?? 90}
              onChange={(e) => setRule({ ...rule, lateHalfDayAfterMinutes: e.target.value })}
            />
            <Input
              label="Late > (mins) = Absent"
              type="number"
              value={rule.lateAbsentAfterMinutes ?? 240}
              onChange={(e) => setRule({ ...rule, lateAbsentAfterMinutes: e.target.value })}
            />
            <Input
              label="Early Leave > (mins) = Half-Day"
              type="number"
              value={rule.earlyHalfDayBeforeMinutes ?? 90}
              onChange={(e) => setRule({ ...rule, earlyHalfDayBeforeMinutes: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Hours < (hrs) = Half-Day"
              type="number"
              step="0.5"
              value={rule.hoursBasedHalfDayMin ?? 5}
              onChange={(e) => setRule({ ...rule, hoursBasedHalfDayMin: e.target.value })}
            />
            <Input
              label="Hours < (hrs) = Absent"
              type="number"
              step="0.5"
              value={rule.hoursBasedAbsentMin ?? 2}
              onChange={(e) => setRule({ ...rule, hoursBasedAbsentMin: e.target.value })}
            />
            <Select
              label="Single Punch Rule"
              options={[
                { value: "HalfDay", label: "Mark Half-Day" },
                { value: "MissingPunch", label: "Flag Missing Punch" },
                { value: "Absent", label: "Mark Absent" },
              ]}
              value={rule.singlePunchAction || "HalfDay"}
              onChange={(e) => setRule({ ...rule, singlePunchAction: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(rule.sandwichRuleEnabled)}
                onChange={(e) => setRule({ ...rule, sandwichRuleEnabled: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Enable Sandwich Rule (Absent/Leave on Friday & Monday marks weekend unpaid)
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(rule.halfDayAutoLeaveAdjust)}
                onChange={(e) => setRule({ ...rule, halfDayAutoLeaveAdjust: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
              />
              Auto-Deduct Half-Day from Leave Balance First
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <Button type="submit" icon={Save} isLoading={saving}>
              Save OFF / Half-Day Rules
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
