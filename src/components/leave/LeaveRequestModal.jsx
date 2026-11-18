"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { leaveService } from "@/services/leaveService";
import { hcmConfigService } from "@/services/hcmConfigService";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

const FALLBACK_LEAVE_OPTIONS = [
  { value: "Annual", label: "Annual Leave" },
  { value: "Casual", label: "Casual Leave" },
  { value: "Sick", label: "Sick / Medical Leave" },
  { value: "Maternity", label: "Maternity Leave" },
  { value: "Paternity", label: "Paternity Leave" },
  { value: "Marriage", label: "Marriage Leave" },
  { value: "Bereavement", label: "Bereavement Leave" },
  { value: "HajjUmrah", label: "Hajj / Umrah Leave" },
  { value: "Study", label: "Study / Exam Leave" },
  { value: "CompOff", label: "Compensatory Off" },
  { value: "ShortLeave", label: "Short Leave (Hours)" },
  { value: "Unpaid", label: "Leave Without Pay (Unpaid)" },
];

export function LeaveRequestModal({ isOpen, onClose, onSubmitted }) {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(false);

  const todayIso = new Date().toISOString().split("T")[0];
  const [leaveOptions, setLeaveOptions] = useState(FALLBACK_LEAVE_OPTIONS);
  const [leaveType, setLeaveType] = useState("Annual");
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(null);

  const employeeId = user?.employeeId || "EMP-003";

  useEffect(() => {
    if (!isOpen) return;
    hcmConfigService.getConfig().then((cfg) => {
      const types = cfg?.leavePolicy?.leaveTypes;
      if (Array.isArray(types) && types.length > 0) {
        setLeaveOptions(
          types.map((t) => ({
            value: t.code,
            label: `${t.name} (${t.paid ? "Paid" : "Unpaid"} • ${t.quota}d/yr)`,
          }))
        );
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !startDate || !endDate) return;
    let active = true;
    leaveService
      .previewLeaveRequest({
        employeeId,
        leaveType,
        startDate,
        endDate,
      })
      .then((res) => {
        if (active) setPreview(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, employeeId, leaveType, startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (preview && !preview.valid) {
      notifyError("Policy Validation Failed", preview.errors[0] || "Cannot submit leave request.");
      return;
    }

    setLoading(true);
    try {
      await leaveService.requestLeave({
        employeeId,
        employeeName: user?.displayName || "Elena Rostova",
        leaveType,
        startDate,
        endDate,
        reason,
      });

      notifySuccess("Leave request submitted", "Evaluated against holidays & leave rules. Awaiting HR/Manager review.");
      setReason("");
      onSubmitted?.();
      onClose();
    } catch (err) {
      notifyError("Failed to submit request", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Time Off"
      description="Live validation against Public Holidays (Tab 08), Weekly Offs, Blackouts, Sandwich Rules & Quotas (Tab 09)."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Leave Category"
          options={leaveOptions}
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => {
              const val = e.target.value;
              setStartDate(val);
              if (endDate < val) setEndDate(val);
            }}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        {/* Live Policy Breakdown */}
        {preview && (
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Calendar Span</span>
              <span className="font-mono text-zinc-200">{preview.totalCalendarDays || 0} day(s)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Skipped Weekly Offs / Public Holidays</span>
              <span className="font-mono text-emerald-400">
                {preview.skippedWeekends || 0} off • {preview.skippedHolidays || 0} holiday(s)
              </span>
            </div>
            {preview.sandwichDaysAdded > 0 && (
              <div className="flex items-center justify-between text-amber-400">
                <span>Sandwich Rule Days Added</span>
                <span className="font-mono font-bold">+{preview.sandwichDaysAdded} day(s)</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800">
              <span className="font-semibold text-zinc-200">Net Chargeable Leave Days</span>
              <span className="font-bold text-indigo-400 font-mono text-sm">
                {preview.chargeableDays || 0} working day(s)
              </span>
            </div>

            {preview.requiresDocument && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Medical certificate recommended/required for extended Sick Leave.</span>
              </div>
            )}

            {preview.warnings?.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}

            {preview.errors?.map((err, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{err}</span>
              </div>
            ))}

            {preview.valid && (!preview.warnings || preview.warnings.length === 0) && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Policy checks passed (Quota, Notice, Blackout & Overlap verified).</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Reason / Notes
          </label>
          <textarea
            rows={3}
            placeholder="Provide context for HR & team lead..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={Boolean(preview && !preview.valid)}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
