"use client";

import React, { useState, useEffect } from "react";
import { Award, TrendingUp, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RankBadge } from "@/components/performance/RankBadge";
import { performanceService } from "@/services/performanceService";
import { employeeService } from "@/services/employeeService";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

export function PromotionRecommendationModal({
  isOpen,
  onClose,
  employee = null,
  onSubmitted,
}) {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(employee?.id || "");
  const [targetRank, setTargetRank] = useState("Rank A");
  const [workScore, setWorkScore] = useState(92);
  const [behaviorScore, setBehaviorScore] = useState(90);
  const [workJustification, setWorkJustification] = useState("");
  const [behaviorJustification, setBehaviorJustification] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        setSelectedEmpId(employee.id);
        const curr = employee.ranking || "Rank B";
        setTargetRank(curr === "Rank C" ? "Rank B" : "Rank A");
        setWorkScore(employee.workScore ?? 90);
        setBehaviorScore(employee.behaviorScore ?? 90);
      } else {
        employeeService.getAllEmployees().then((list) => {
          setEmployees(list);
          if (list.length > 0 && !selectedEmpId) {
            setSelectedEmpId(list[0].id);
            const curr = list[0].ranking || "Rank B";
            setTargetRank(curr === "Rank C" ? "Rank B" : "Rank A");
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
      const curr = found.ranking || "Rank B";
      setTargetRank(curr === "Rank C" ? "Rank B" : "Rank A");
      setWorkScore(found.workScore ?? 88);
      setBehaviorScore(found.behaviorScore ?? 88);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeEmployee) {
      notifyError("Missing Employee", "Please select an employee to recommend.");
      return;
    }

    if (!workJustification.trim() || !behaviorJustification.trim()) {
      notifyError("Missing Evaluation", "Please provide work and behavioral conduct justifications.");
      return;
    }

    setLoading(true);
    try {
      await performanceService.submitPromotionRecommendation({
        employeeId: activeEmployee.id,
        employeeName: activeEmployee.name,
        department: activeEmployee.department,
        jobTitle: activeEmployee.jobTitle,
        currentRank: activeEmployee.ranking || "Rank B",
        recommendedRank: targetRank,
        workScore: Number(workScore),
        behaviorScore: Number(behaviorScore),
        workJustification: workJustification.trim(),
        behaviorJustification: behaviorJustification.trim(),
        submittedBy: `${user?.displayName || "HR Partner"} (HR)`,
      });

      notifySuccess(
        "Recommendation Submitted",
        `Promotion recommendation for ${activeEmployee.name} sent to Executive Admin.`
      );
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      notifyError("Submission Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recommend Employee Promotion & Rank Change"
      description="HR evaluation framework: assess employee work delivery and behavioral conduct to recommend executive tier promotion."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Employee Selector */}
        {!employee ? (
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Select Workforce Member *
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

        {/* Target Rank Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Current Rank
            </label>
            <div className="p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40 flex items-center gap-2">
              <RankBadge rank={activeEmployee?.ranking || "Rank B"} size="sm" />
              <span className="text-xs text-zinc-400">
                (Current Tier)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Recommended Target Rank *
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

        {/* Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-zinc-800/20 border border-zinc-800">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-zinc-200">
                Work Output Score
              </label>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {workScore} / 100
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mb-2">
              KPIs, sprint deliverables, project SLAs & attendance punctuality.
            </p>
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
                Behavior & Conduct Score
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {behaviorScore} / 100
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mb-2">
              Team collaboration, attitude, ethics, mentoring & peer alignment.
            </p>
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

        {/* Work Justification */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Work Performance Justification & Evidence *
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/60 p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Cite sprint metrics, OKR achievements, or technical problem solving..."
            value={workJustification}
            onChange={(e) => setWorkJustification(e.target.value)}
            required
          />
        </div>

        {/* Behavior Justification */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Behavioral Conduct & Cultural Impact Justification *
          </label>
          <textarea
            rows={2}
            className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700/60 p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Describe teamwork attitude, leadership initiative, communication and conflict resolution..."
            value={behaviorJustification}
            onChange={(e) => setBehaviorJustification(e.target.value)}
            required
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Transfers to Admin Executive Portal for approval</span>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading} icon={TrendingUp}>
              Submit to Admin
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
