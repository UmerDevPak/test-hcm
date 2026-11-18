/**
 * @file payrollService.js
 * @description Enterprise Payroll Engine driven dynamically by 10-Tab HCM Setup (Tab 10 Salary Setup, Tab 04 Late, Tab 05 OT)
 */

import { INITIAL_PAYROLL_RUNS, INITIAL_EMPLOYEES } from "@/lib/seedData";
import { isLiveFirebaseConfigured, db, auth } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { getLiveUserAccess } from "@/lib/firebase/roleCheck";
import { calculateEmployeeMonthlyPayroll } from "@/lib/hcmEngine";
import { hcmConfigService } from "./hcmConfigService";
import { attendanceService } from "./attendanceService";
import { leaveService } from "./leaveService";
import { auditService } from "./auditService";
import { activityNotificationService } from "./activityNotificationService";

const STORAGE_PAYROLL = "hcm_lite_payroll_runs";

function getRuns() {
  if (typeof window === "undefined") return INITIAL_PAYROLL_RUNS;
  const stored = localStorage.getItem(STORAGE_PAYROLL);
  if (!stored) {
    localStorage.setItem(STORAGE_PAYROLL, JSON.stringify(INITIAL_PAYROLL_RUNS));
    return INITIAL_PAYROLL_RUNS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_PAYROLL_RUNS;
  }
}

function saveRuns(list) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_PAYROLL, JSON.stringify(list));
  }
}

let memoryPayrollCache = null;
let lastPayrollFetch = 0;

export const payrollService = {
  invalidateCache() {
    memoryPayrollCache = null;
    lastPayrollFetch = 0;
  },

  peekCachedPayrollRuns() {
    if (memoryPayrollCache) return [...memoryPayrollCache];
    if (typeof window === "undefined") return null;
    return getRuns();
  },

  async getAllPayrollRuns(forceRefresh = false) {
    if (!forceRefresh && memoryPayrollCache && Date.now() - lastPayrollFetch < 60000) {
      return [...memoryPayrollCache];
    }

    const list = [...getRuns()];

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const access = await getLiveUserAccess();
        const { collection, getDocs, query, where } = await import("firebase/firestore");
        const q = access.isHrOrAdmin
          ? collection(db, "payroll_runs")
          : query(collection(db, "payroll_runs"), where("status", "==", "Finalized"));
        const snap = await Promise.race([
          getDocs(q),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
        ]);
        if (!snap.empty) {
          const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          remote.forEach((rem) => {
            const idx = list.findIndex((l) => l.id === rem.id);
            if (idx !== -1) list[idx] = { ...list[idx], ...rem };
            else list.unshift(rem);
          });
        }
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.LIST, "payroll_runs");
        }
        console.warn("[payrollService] Firestore read notice:", err.message);
      }
    }

    memoryPayrollCache = list;
    lastPayrollFetch = Date.now();
    return list;
  },

  async getPayrollRunById(id) {
    const runs = await this.getAllPayrollRuns();
    return runs.find((r) => r.id === id) || null;
  },

  /**
   * Calculate single employee payroll dynamically under active HCM Setup config
   */
  async calculateEmployeePayroll(employee, { attendanceRecords = null, approvedLeaves = null, periodStart = null, periodEnd = null } = {}) {
    const [config, attLogs, leaveReqs] = await Promise.all([
      hcmConfigService.getConfig(),
      Array.isArray(attendanceRecords)
        ? Promise.resolve(attendanceRecords)
        : attendanceService.getAllRecords({ employeeId: employee?.id || "" }),
      Array.isArray(approvedLeaves)
        ? Promise.resolve(approvedLeaves)
        : leaveService.getAllRequests({ employeeId: employee?.id || "" }),
    ]);

    return calculateEmployeeMonthlyPayroll({
      config,
      employee: employee || { annualSalary: 120000 },
      attendanceRecords: attLogs,
      approvedLeaves: leaveReqs,
      periodStart,
      periodEnd,
    });
  },

  /**
   * Executes a Payroll Batch:
   * - HR creates a Draft batch (status: "Draft", isLocked: false)
   * - Admin executes & finalizes (status: "Finalized", isLocked: true) AND locks attendance up to periodEnd
   */
  async runPayroll({
    period,
    payDate,
    periodStart = null,
    periodEnd = null,
    processedBy = "Sarah Connor",
    actorRole = "ADMIN",
    mode = "Finalized", // "Draft" | "Finalized"
    employees = INITIAL_EMPLOYEES,
    attendanceRecords = null,
    approvedLeaves = null,
  }) {
    const [config, attLogs, leaveReqs] = await Promise.all([
      hcmConfigService.getConfig(),
      Array.isArray(attendanceRecords) ? Promise.resolve(attendanceRecords) : attendanceService.getAllRecords(),
      Array.isArray(approvedLeaves) ? Promise.resolve(approvedLeaves) : leaveService.getAllRequests(),
    ]);

    const effectiveEnd = periodEnd || payDate || new Date().toISOString().split("T")[0];
    const effectiveStart = periodStart || `${effectiveEnd.slice(0, 7)}-01`;

    let totalGross = 0;
    let totalNet = 0;
    let totalTaxes = 0;
    let totalDeductions = 0;

    const payslips = employees.map((emp) => {
      const breakdown = calculateEmployeeMonthlyPayroll({
        config,
        employee: emp,
        attendanceRecords: attLogs,
        approvedLeaves: leaveReqs,
        periodStart: effectiveStart,
        periodEnd: effectiveEnd,
      });

      totalGross += breakdown.totalGross;
      totalNet += breakdown.netPay;
      totalTaxes += breakdown.totalTaxes;
      totalDeductions += breakdown.totalDeductions;

      return {
        payslipId: `PS-${emp.id}-${Date.now().toString().slice(-4)}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        jobTitle: emp.jobTitle,
        bankDetails: emp.bankDetails,
        ...breakdown,
      };
    });

    const isFinal = mode === "Finalized";
    const newRun = {
      id: `PR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      period: period || `${effectiveStart} to ${effectiveEnd}`,
      periodStart: effectiveStart,
      periodEnd: effectiveEnd,
      payDate: payDate || effectiveEnd,
      status: isFinal ? "Finalized" : "Draft",
      isLocked: isFinal,
      calculationMethod: config?.salarySetup?.calculationMethod || "WorkingDays",
      totalGross: Number(totalGross.toFixed(2)),
      totalNet: Number(totalNet.toFixed(2)),
      totalTaxes: Number(totalTaxes.toFixed(2)),
      totalDeductions: Number(totalDeductions.toFixed(2)),
      employeeCount: employees.length,
      processedBy,
      processedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      payslips,
    };

    const runs = getRuns();
    runs.unshift(newRun);
    saveRuns(runs);
    this.invalidateCache();

    // Persist summary metadata to Firestore (adhering strictly to blueprint schema)
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "payroll_runs", newRun.id), {
          id: newRun.id,
          period: newRun.period,
          payDate: newRun.payDate,
          status: newRun.status,
          isLocked: newRun.isLocked,
          totalGross: newRun.totalGross,
          totalNet: newRun.totalNet,
          totalTaxes: newRun.totalTaxes,
          totalDeductions: newRun.totalDeductions,
          employeeCount: newRun.employeeCount,
          processedAt: newRun.processedAt,
        });
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.CREATE, `payroll_runs/${newRun.id}`);
        }
        console.warn("[payrollService] Firestore create notice:", err.message);
      }
    }

    // PDF Cross-Cutting Rule: Lock Attendance period when Finalized
    if (isFinal) {
      const currentAttRule = config.attendanceRule || {};
      if (!currentAttRule.attendanceLockedUpTo || effectiveEnd > currentAttRule.attendanceLockedUpTo) {
        await hcmConfigService.updateSection(
          "attendanceRule",
          { ...currentAttRule, attendanceLockedUpTo: effectiveEnd },
          {
            actor: processedBy,
            role: actorRole,
            module: "Payroll & Attendance Lock",
            action: "Locked Attendance Period via Payroll Finalization",
            target: `Locked up to ${effectiveEnd} (${newRun.id})`,
          }
        );
      }
    }

    await auditService.logAudit({
      actor: processedBy,
      role: actorRole,
      module: "Payroll Engine",
      action: isFinal ? "Finalized & Locked Payroll Run" : "Prepared Monthly Payroll Draft",
      target: `${newRun.id} • ${newRun.period} (${newRun.employeeCount} staff)`,
      oldValue: isFinal ? "Draft/Unprocessed" : "None",
      newValue: `${newRun.status} ($${newRun.totalNet.toLocaleString()} net)`,
      status: isFinal ? "success" : "info",
    });

    activityNotificationService.addNotification({
      title: isFinal ? "Payroll Batch Finalized & Disbursed" : "Monthly Payroll Draft Ready",
      message: isFinal
        ? `${processedBy} finalized payroll ${newRun.id} (${newRun.period}). Attendance up to ${effectiveEnd} is now locked.`
        : `${processedBy} prepared Payroll Draft ${newRun.id} (${newRun.period}) awaiting Admin finalization.`,
      actor: { name: processedBy, role: actorRole },
      actorRole,
      targetAudience: "ADMIN_HR",
      type: "payroll",
      link: "/payroll",
    });

    return newRun;
  },

  /**
   * Admin Finalizes & Permanently Locks an HR-prepared Draft batch
   */
  async finalizePayrollRun(id, actor = "Sarah Connor") {
    const runs = getRuns();
    const idx = runs.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error("Payroll run not found");

    const run = runs[idx];
    if (run.isLocked || run.status === "Finalized") {
      throw new Error("Payroll batch is already finalized and locked.");
    }

    const updatedRun = {
      ...run,
      status: "Finalized",
      isLocked: true,
      finalizedBy: actor,
      processedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    };
    runs[idx] = updatedRun;
    saveRuns(runs);
    this.invalidateCache();

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "payroll_runs", id), {
          id: updatedRun.id,
          period: updatedRun.period,
          payDate: updatedRun.payDate,
          status: "Finalized",
          isLocked: true,
          totalGross: updatedRun.totalGross,
          totalNet: updatedRun.totalNet,
          totalTaxes: updatedRun.totalTaxes,
          totalDeductions: updatedRun.totalDeductions,
          employeeCount: updatedRun.employeeCount,
          processedAt: updatedRun.processedAt,
        }, { merge: true });
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.UPDATE, `payroll_runs/${id}`);
        }
      }
    }

    const lockDate = updatedRun.periodEnd || updatedRun.payDate;
    if (lockDate) {
      const config = await hcmConfigService.getConfig();
      const attRule = config.attendanceRule || {};
      if (!attRule.attendanceLockedUpTo || lockDate > attRule.attendanceLockedUpTo) {
        await hcmConfigService.updateSection(
          "attendanceRule",
          { ...attRule, attendanceLockedUpTo: lockDate },
          {
            actor,
            role: "ADMIN",
            module: "Payroll & Attendance Lock",
            action: "Locked Attendance via Payroll Finalization",
            target: `${id} (Locked up to ${lockDate})`,
          }
        );
      }
    }

    await auditService.logAudit({
      actor,
      role: "ADMIN",
      module: "Payroll Engine",
      action: "Finalized & Locked Payroll Draft",
      target: `${updatedRun.id} (${updatedRun.period})`,
      oldValue: "Draft",
      newValue: "Finalized (Locked)",
      status: "success",
    });

    return updatedRun;
  },

  async updatePayrollRun(id, updates) {
    const runs = getRuns();
    const run = runs.find((r) => r.id === id);
    if (!run) throw new Error("Payroll run not found");
    if (run.isLocked || run.status === "Finalized" || run.status === "Completed") {
      const err = new Error("Forbidden: Finalized payroll runs are permanently locked.");
      err.status = 403;
      throw err;
    }
    Object.assign(run, updates);
    saveRuns(runs);
    this.invalidateCache();
    return run;
  },

  async deletePayrollRun(id, actor = "Sarah Connor") {
    const runs = getRuns();
    const run = runs.find((r) => r.id === id);
    if (!run) throw new Error("Payroll run not found");
    if (run.isLocked || run.status === "Finalized" || run.status === "Completed") {
      const err = new Error("Forbidden: Finalized payroll runs are permanently locked.");
      err.status = 403;
      throw err;
    }
    const filtered = runs.filter((r) => r.id !== id);
    saveRuns(filtered);
    this.invalidateCache();

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "payroll_runs", id));
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.DELETE, `payroll_runs/${id}`);
        }
      }
    }

    await auditService.logAudit({
      actor,
      role: "ADMIN",
      module: "Payroll Engine",
      action: "Deleted Draft Payroll Run",
      target: `${run.id} (${run.period})`,
      status: "warning",
    });

    return true;
  },

  async getPayslip(payrollRunId, employeeId) {
    const run = await this.getPayrollRunById(payrollRunId);
    if (!run) return null;
    if (run.payslips) {
      return run.payslips.find((p) => p.employeeId === employeeId) || null;
    }
    return null;
  },
};
