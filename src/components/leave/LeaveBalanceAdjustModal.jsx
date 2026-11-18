"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { employeeService } from "@/services/employeeService";
import { leaveService } from "@/services/leaveService";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

export function LeaveBalanceAdjustModal({ isOpen, onClose, onAdjusted }) {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState("");
  const [currentBalances, setCurrentBalances] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    employeeService.getAllEmployees().then((list) => {
      setEmployees(list);
      const firstId = list[0]?.id || "EMP-003";
      setEmployeeId((prev) => prev || firstId);
    });
    setDelta("1");
    setReason("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !employeeId) return;
    leaveService.getEmployeeBalances(employeeId).then(setCurrentBalances);
  }, [isOpen, employeeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const emp = employees.find((item) => item.id === employeeId);
      await leaveService.adjustEmployeeBalance({
        employeeId,
        employeeName: emp?.name || employeeId,
        leaveType,
        delta: Number(delta),
        reason,
        actor: user?.displayName || "Aaliyah Patel",
      });

      notifySuccess(
        "Leave Balance Adjusted",
        `Updated ${emp?.name || employeeId}'s ${leaveType} quota by ${Number(delta) >= 0 ? `+${delta}` : delta} day(s) & recorded audit trail.`
      );
      onAdjusted?.();
      onClose();
    } catch (err) {
      notifyError("Adjustment Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Leave Balance Adjustment (HR Audit)"
      description="Add or deduct employee leave days per Tab 09 Section 9.3. A compulsory audit reason is permanently logged."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Target Employee"
          options={employees.map((e) => ({
            value: e.id,
            label: `${e.name} (${e.id}) — ${e.department}`,
          }))}
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          required
        />

        {currentBalances && (
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs text-center">
            <div>
              <span className="text-zinc-500 block text-[10px]">Annual Left</span>
              <span className="font-mono font-bold text-indigo-400">{currentBalances.annual ?? 14} d</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Sick Left</span>
              <span className="font-mono font-bold text-emerald-400">{currentBalances.sick ?? 8} d</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Casual Left</span>
              <span className="font-mono font-bold text-amber-400">{currentBalances.casual ?? 10} d</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Leave Bucket"
            options={[
              { value: "annual", label: "Annual Leave" },
              { value: "sick", label: "Sick / Medical Leave" },
              { value: "casual", label: "Casual Leave" },
            ]}
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
          />
          <Input
            label="Adjustment Days (+ Add / - Deduct)"
            type="number"
            step="0.5"
            min="-30"
            max="30"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Mandatory Audit Reason
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Carry-forward adjustment from 2025, Comp-Off credit for weekend server migration, or attendance penalty..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Save Balance Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
