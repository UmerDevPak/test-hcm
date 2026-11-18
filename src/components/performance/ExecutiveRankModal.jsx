"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Award, Crown, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { RankBadge } from "@/components/performance/RankBadge";
import { performanceService } from "@/services/performanceService";
import { employeeService } from "@/services/employeeService";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

export function ExecutiveRankModal({
  isOpen,
  onClose,
  employee = null,
  onPromoted,
}) {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(employee?.id || "");
  const [targetRank, setTargetRank] = useState("Rank A");
  const [workScore, setWorkScore] = useState(95);
  const [behaviorScore, setBehaviorScore] = useState(95);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        setSelectedEmpId(employee.id);
        const curr = employee.ranking || "Rank B";
        setTargetRank(curr === "Rank A" ? "Rank A" : "Rank A");
        setWorkScore(employee.workScore ?? 95);
        setBehaviorScore(employee.behaviorScore ?? 95);
        setReason(`Executive promotion to ${curr === "Rank A" ? "Rank A (Confirmed)" : "Rank A"} based on high performance.`);
      } else {
        employeeService.getAllEmployees().then((list) => {
          setEmployees(list);
          if (list.length > 0 && !selectedEmpId) {
            setSelectedEmpId(list[0].id);
            setTargetRank("Rank A");
            setWorkScore(list[0].workScore ?? 95);
            setBehaviorScore(list[0].behaviorScore ?? 95);
            setReason("Executive promotion and tier adjustment by Super Admin.");
          }
        });
      }
    }
  }, [isOpen, employee]);

  const activeEmployee = employee || employees.find((e) => e.id === selectedEmpId) || null;

  const handleEmployeeChange = (e) => {
    const id = e.target.value;
    setSelectedEmpId(id);
    const found = employees.find((emp) => emp.id === id);
    if (found) {
      setWorkScore(found.workScore ?? 95);
      setBehaviorScore(found.behaviorScore ?? 95);
      setReason(`Executive promotion for ${found.name} based on comprehensive evaluation.`);
    }
  };

  const handlePromote = async (e) => {
    e.preventDefault();
    if (!activeEmployee) {
      notifyError("Missing Employee", "Please select an employee.");
      return;
    }

    setLoading(true);
    try {
      await performanceService.promoteEmployeeDirectly({
        employeeId: activeEmployee.id,
        newRank: targetRank,
        adminName: `${user?.displayName || "Sarah Connor"} (Super Admin)`,
        reason: reason.trim() || `Executive promotion to ${targetRank} approved by Super Admin.`,
        workScore: Number(workScore),
        behaviorScore: Number(behaviorScore),
      });

      notifySuccess(
        "Rank Promoted & Applied",
        `${activeEmployee.name} has been promoted to ${targetRank}. Notification banner is now active in their portal.`
      );
      if (onPromoted) onPromoted();
      onClose();
    } catch (err) {
      notifyError("Promotion Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Executive Promotion & Rank Categorization"
      description="Super Admin authority: directly adjust employee performance tier, update scores, and publish celebratory promotion banner to their portal."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handlePromote} className="space-y-4 pt-2">
        {!employee ? (
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Select Employee *
            </label>
            <Select
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.name} (${e.id}) — ${e.jobTitle} [Current: ${e.ranking || "Rank B"}]`,
              }))}
              value={selectedEmpId}
              onChange={handleEmployeeChange}
              required
            />
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-zinc-100">{activeEmployee.name}</div>
              <div className="text-[11px] text-zinc-400">
                {activeEmployee.jobTitle} • {activeEmployee.department}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400">Current:</span>
              <RankBadge rank={activeEmployee.ranking || "Rank B"} size="sm" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Current Rank
            </label>
            <div className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40 flex items-center gap-2">
              <RankBadge rank={activeEmployee?.ranking || "Rank B"} size="sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              New Assigned Rank *
            </label>
            <Select
              options={[
                { value: "Rank A", label: "Rank A · Top Performer (90%+)" },
                { value: "Rank B", label: "Rank B · Core Performer (75%-89%)" },
                { value: "Rank C", label: "Rank C · Developing (<75%)" },
              ]}
              value={targetRank}
              onChange={(e) => setTargetRank(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-zinc-800/30 border border-zinc-800">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-zinc-200">
                Work Score
              </label>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {workScore} / 100
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={workScore}
              onChange={(e) => setWorkScore(e.target.value)}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-zinc-200">
                Behavior Score
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {behaviorScore} / 100
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={behaviorScore}
              onChange={(e) => setBehaviorScore(e.target.value)}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Executive Decision & Citation *
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/60 p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Reason for rank adjustment or promotion celebration remark..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Immediately syncs to database & audit log</span>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading} icon={Crown}>
              Execute Promotion
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
