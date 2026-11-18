"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { correctionService } from "@/services/correctionService";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

const REQUEST_TYPES = [
  "Missing Punch",
  "Check-In Correction",
  "Check-Out Correction",
  "WFH Request",
  "On-Duty / Field Visit",
  "Overtime Claim",
  "Gate Pass",
];

const WORK_MODES = ["Office (HQ)", "WFH", "On-Duty"];

export function CorrectionRequestModal({
  isOpen,
  onClose,
  onSubmitted,
  defaultDate = "",
  defaultType = "Missing Punch",
}) {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(false);

  const todayIso = new Date().toISOString().split("T")[0];
  const [requestType, setRequestType] = useState(defaultType || "Missing Punch");
  const [date, setDate] = useState(defaultDate || todayIso);
  const [requestedTime, setRequestedTime] = useState("09:00 AM");
  const [requestedClockOut, setRequestedClockOut] = useState("06:00 PM");
  const [workMode, setWorkMode] = useState("Office (HQ)");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRequestType(defaultType || "Missing Punch");
      setDate(defaultDate || new Date().toISOString().split("T")[0]);
      setRequestedTime("09:00 AM");
      setRequestedClockOut("06:00 PM");
      setWorkMode(
        defaultType === "WFH Request"
          ? "WFH"
          : defaultType === "On-Duty / Field Visit"
          ? "On-Duty"
          : "Office (HQ)"
      );
      setReason("");
    }
  }, [isOpen, defaultDate, defaultType]);

  const handleTypeChange = (val) => {
    setRequestType(val);
    if (val === "WFH Request") setWorkMode("WFH");
    else if (val === "On-Duty / Field Visit") setWorkMode("On-Duty");
    else setWorkMode("Office (HQ)");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await correctionService.submitCorrection({
        employeeId: user?.employeeId || "EMP-003",
        employeeName: user?.displayName || "Elena Rostova",
        department: user?.department || "Engineering",
        requestType,
        date,
        requestedTime,
        requestedClockOut,
        workMode,
        reason,
      });

      notifySuccess(
        "Correction Request Submitted",
        `${requestType} for ${date} sent to HR & Manager review queue.`
      );
      onSubmitted?.();
      onClose();
    } catch (err) {
      notifyError("Submission Blocked by Policy", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Attendance Correction / WFH / OT"
      description="Enforces active Tab 03 Attendance Rules (correction window days, payroll lock, and compulsory audit reason)."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Request Category"
            options={REQUEST_TYPES}
            value={requestType}
            onChange={(e) => handleTypeChange(e.target.value)}
          />
          <Select
            label="Work Mode"
            options={WORK_MODES}
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Attendance Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label={requestType === "Check-Out Correction" ? "Clock-In Ref" : "Clock-In Time"}
            placeholder="09:00 AM"
            value={requestedTime}
            onChange={(e) => setRequestedTime(e.target.value)}
            required
          />
          <Input
            label="Clock-Out Time"
            placeholder="06:00 PM"
            value={requestedClockOut}
            onChange={(e) => setRequestedClockOut(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Compulsory Reason & Supporting Context
          </label>
          <textarea
            rows={3}
            placeholder="Explain biometric issue, client visit, remote work deliverable, or approved overtime task..."
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
          <Button type="submit" isLoading={loading}>
            Submit Correction Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
