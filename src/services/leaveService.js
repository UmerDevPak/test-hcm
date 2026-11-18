import { LEAVE_STATUS, LEAVE_QUOTAS } from "@/lib/constants";
import { isLiveFirebaseConfigured, db, auth } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { getLiveUserAccess } from "@/lib/firebase/roleCheck";
import { hcmConfigService } from "./hcmConfigService";
import { employeeService } from "./employeeService";
import { auditService } from "./auditService";
import { activityNotificationService } from "./activityNotificationService";
import { evaluateLeaveRequest } from "@/lib/hcmEngine";

const STORAGE_BALANCES = "hcm_lite_leave_balances";
const STORAGE_REQUESTS = "hcm_lite_leave_requests";

const INITIAL_SPEC_BALANCES = {
  "EMP-001": { annual: 14, sick: 8, casual: 10, vacation: 14, compOff: 2 },
  "EMP-002": { annual: 12, sick: 8, casual: 9, vacation: 12, compOff: 1 },
  "EMP-003": { annual: 10, sick: 7, casual: 8, vacation: 10, compOff: 2 },
  "EMP-004": { annual: 14, sick: 8, casual: 10, vacation: 14, compOff: 0 },
  "EMP-005": { annual: 13, sick: 8, casual: 9, vacation: 13, compOff: 1 },
  "EMP-006": { annual: 9, sick: 6, casual: 7, vacation: 9, compOff: 0 },
  "EMP-007": { annual: 2, sick: 2, casual: 4, vacation: 2, compOff: 0 },
  "EMP-008": { annual: 11, sick: 8, casual: 10, vacation: 11, compOff: 0 },
};

const INITIAL_SPEC_REQUESTS = [
  {
    id: "LV-1001",
    employeeId: "EMP-007",
    employeeName: "Chloe Dupont",
    leaveType: "Annual",
    startDate: "2026-10-15",
    endDate: "2026-10-25",
    daysCount: 7,
    reason: "Extended annual family leave.",
    status: LEAVE_STATUS.APPROVED,
    appliedAt: "2026-09-20",
    reviewedBy: "Sarah Connor",
    reviewedAt: "2026-09-21",
  },
  {
    id: "LV-1002",
    employeeId: "EMP-003",
    employeeName: "Elena Rostova",
    leaveType: "Annual",
    startDate: "2026-11-02",
    endDate: "2026-11-06",
    daysCount: 5,
    reason: "Family vacation trip.",
    status: LEAVE_STATUS.PENDING,
    appliedAt: "2026-10-22",
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    id: "LV-1003",
    employeeId: "EMP-006",
    employeeName: "Lucas Silva",
    leaveType: "Sick",
    startDate: "2026-10-20",
    endDate: "2026-10-21",
    daysCount: 2,
    reason: "Flu recovery.",
    status: LEAVE_STATUS.APPROVED,
    appliedAt: "2026-10-20",
    reviewedBy: "Sarah Connor",
    reviewedAt: "2026-10-20",
  },
];

function getBalances() {
  if (typeof window === "undefined") return INITIAL_SPEC_BALANCES;
  const stored = localStorage.getItem(STORAGE_BALANCES);
  if (!stored) {
    localStorage.setItem(STORAGE_BALANCES, JSON.stringify(INITIAL_SPEC_BALANCES));
    return INITIAL_SPEC_BALANCES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_SPEC_BALANCES;
  }
}

function getRequests() {
  if (typeof window === "undefined") return INITIAL_SPEC_REQUESTS;
  const stored = localStorage.getItem(STORAGE_REQUESTS);
  if (!stored) {
    localStorage.setItem(STORAGE_REQUESTS, JSON.stringify(INITIAL_SPEC_REQUESTS));
    return INITIAL_SPEC_REQUESTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_SPEC_REQUESTS;
  }
}

function saveBalances(data) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_BALANCES, JSON.stringify(data));
}

function saveRequests(data) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_REQUESTS, JSON.stringify(data));
}

let memoryLeaveRequestsCache = null;
let lastLeaveFetchTime = 0;
let inFlightLeaveRequestsPromise = null;
const LEAVE_CACHE_TTL_MS = 120000;

export const leaveService = {
  invalidateCache() {
    memoryLeaveRequestsCache = null;
    lastLeaveFetchTime = 0;
  },

  peekCachedRequests({ status = "", employeeId = "" } = {}) {
    if (!memoryLeaveRequestsCache) return null;
    let result = [...memoryLeaveRequestsCache];
    if (status) result = result.filter((r) => r.status === status);
    if (employeeId) result = result.filter((r) => r.employeeId === employeeId);
    return result;
  },

  async getEmployeeBalances(employeeId) {
    if (isLiveFirebaseConfigured && db && auth?.currentUser && employeeId) {
      try {
        const access = await getLiveUserAccess();
        if (access.isHrOrAdmin || access.employeeId === employeeId) {
          const { doc, getDoc } = await import("firebase/firestore");
          const snap = await getDoc(doc(db, "leave_balances", employeeId));
          if (snap.exists()) {
            return snap.data();
          }
        }
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.GET, `leave_balances/${employeeId}`);
        }
        console.warn("[leaveService] Firestore balances read notice:", err.message);
      }
    }

    const balances = getBalances();
    const config = hcmConfigService.peekCachedConfig();
    const leaveTypes = config?.leavePolicy?.leaveTypes || [];
    const annualQuota = leaveTypes.find((t) => t.code === "Annual")?.quota ?? LEAVE_QUOTAS.ANNUAL;
    const sickQuota = leaveTypes.find((t) => t.code === "Sick")?.quota ?? LEAVE_QUOTAS.SICK;
    const casualQuota = leaveTypes.find((t) => t.code === "Casual")?.quota ?? LEAVE_QUOTAS.CASUAL;

    return (
      balances[employeeId] || {
        annual: annualQuota,
        sick: sickQuota,
        casual: casualQuota,
        vacation: annualQuota,
        compOff: 0,
      }
    );
  },

  async getAllRequests({ status = "", employeeId = "" } = {}, forceRefresh = false) {
    const now = Date.now();
    let list;
    if (!forceRefresh && memoryLeaveRequestsCache && now - lastLeaveFetchTime < LEAVE_CACHE_TTL_MS) {
      list = [...memoryLeaveRequestsCache];
    } else if (!forceRefresh && inFlightLeaveRequestsPromise) {
      list = [...(await inFlightLeaveRequestsPromise)];
    } else {
      inFlightLeaveRequestsPromise = (async () => {
        const localList = [...getRequests()];

        if (isLiveFirebaseConfigured && db && auth?.currentUser) {
          try {
            const { collection, getDocs, query, where } = await import("firebase/firestore");
            const access = await getLiveUserAccess();
            const reqQuery = access.isHrOrAdmin
              ? collection(db, "leave_requests")
              : query(collection(db, "leave_requests"), where("uid", "==", auth.currentUser.uid));
            const snap = await Promise.race([
              getDocs(reqQuery),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
            ]);
            if (!snap.empty) {
              const remoteList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              remoteList.forEach((rem) => {
                const idx = localList.findIndex((l) => l.id === rem.id);
                if (idx !== -1) localList[idx] = rem;
                else localList.unshift(rem);
              });
            }
          } catch (err) {
            if (isPermissionError(err)) {
              handleFirestoreError(err, OperationType.LIST, "leave_requests");
            }
            console.warn("[leaveService] Firestore requests read notice:", err.message);
          }
        }

        memoryLeaveRequestsCache = localList;
        lastLeaveFetchTime = Date.now();
        return localList;
      })();

      try {
        list = [...(await inFlightLeaveRequestsPromise)];
      } finally {
        inFlightLeaveRequestsPromise = null;
      }
    }

    let result = [...list];
    if (status) result = result.filter((r) => r.status === status);
    if (employeeId) result = result.filter((r) => r.employeeId === employeeId);
    return result;
  },

  async previewLeaveRequest({ employeeId, leaveType, startDate, endDate }) {
    const [config, employee, balances, existingRequests] = await Promise.all([
      hcmConfigService.getConfig(),
      employeeService.getEmployeeById(employeeId),
      this.getEmployeeBalances(employeeId),
      this.getAllRequests({ employeeId }),
    ]);

    return evaluateLeaveRequest({
      config,
      employee: employee || { id: employeeId },
      leaveType,
      startDate,
      endDate,
      balances,
      existingRequests,
    });
  },

  async requestLeave({ employeeId, employeeName, leaveType, startDate, endDate, reason }) {
    const [config, employee, balances, currentRequests] = await Promise.all([
      hcmConfigService.getConfig(),
      employeeService.getEmployeeById(employeeId),
      this.getEmployeeBalances(employeeId),
      this.getAllRequests(),
    ]);

    const evaluation = evaluateLeaveRequest({
      config,
      employee: employee || { id: employeeId, name: employeeName },
      leaveType,
      startDate,
      endDate,
      balances,
      existingRequests: currentRequests,
    });

    if (!evaluation.valid) {
      const err = new Error(evaluation.errors[0] || "Leave policy validation failed.");
      err.status = 422;
      throw err;
    }

    const normalizedType = ["Annual", "Sick", "Casual", "Unpaid", "Maternity", "Paternity", "Marriage", "Bereavement", "HajjUmrah", "Study", "CompOff", "ShortLeave"].includes(leaveType)
      ? leaveType
      : "Annual";

    const newReq = {
      id: `LV-${Math.floor(1000 + Math.random() * 9000)}`,
      uid: auth?.currentUser?.uid || employeeId,
      employeeId,
      employeeName,
      leaveType: normalizedType,
      startDate,
      endDate,
      daysCount: evaluation.chargeableDays,
      reason,
      status: LEAVE_STATUS.PENDING,
      appliedAt: new Date().toISOString().split("T")[0],
      reviewedBy: null,
      reviewedAt: null,
    };

    const localList = getRequests();
    localList.unshift(newReq);
    saveRequests(localList);
    memoryLeaveRequestsCache = null;

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "leave_requests", newReq.id), {
          id: newReq.id,
          uid: newReq.uid,
          employeeId: newReq.employeeId,
          employeeName: newReq.employeeName,
          leaveType: newReq.leaveType,
          startDate: newReq.startDate,
          endDate: newReq.endDate,
          daysCount: newReq.daysCount,
          reason: newReq.reason,
          status: newReq.status,
          appliedAt: newReq.appliedAt,
          reviewedBy: null,
          reviewedAt: null,
        });
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.CREATE, `leave_requests/${newReq.id}`);
        }
        console.warn("[leaveService] Firestore leave request save notice:", err.message);
      }
    }

    await auditService.logAudit({
      actor: employeeName,
      role: "EMPLOYEE",
      module: "Leave Management",
      action: `Submitted ${normalizedType} Leave Request`,
      target: `${startDate} to ${endDate} (${evaluation.chargeableDays} days)`,
      status: "info",
    });

    activityNotificationService.addNotification({
      title: `New ${normalizedType} Leave Application`,
      message: `${employeeName} applied for ${evaluation.chargeableDays} days (${startDate} → ${endDate}).`,
      actor: { name: employeeName, role: "EMPLOYEE" },
      actorRole: "EMPLOYEE",
      targetAudience: "ADMIN_HR",
      type: "leave",
      link: "/leave",
    });

    return { ...newReq, evaluation };
  },

  async updateRequestStatus(requestId, status, reviewerName = "HR Manager") {
    const requests = getRequests();
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) return null;

    const request = requests[index];
    request.status = status;
    request.reviewedBy = reviewerName;
    request.reviewedAt = new Date().toISOString().split("T")[0];

    let updatedBalance = null;
    if (status === LEAVE_STATUS.APPROVED && request.leaveType !== "Unpaid") {
      const balances = getBalances();
      const empBalance = balances[request.employeeId] || {
        annual: LEAVE_QUOTAS.ANNUAL,
        sick: LEAVE_QUOTAS.SICK,
        casual: LEAVE_QUOTAS.CASUAL,
      };

      const typeKey = request.leaveType.toLowerCase().includes("sick")
        ? "sick"
        : request.leaveType.toLowerCase().includes("casual")
        ? "casual"
        : "annual";

      empBalance[typeKey] = Math.max(0, (empBalance[typeKey] || 0) - request.daysCount);
      empBalance.vacation = empBalance.annual;
      balances[request.employeeId] = empBalance;
      saveBalances(balances);
      updatedBalance = {
        annual: empBalance.annual,
        sick: empBalance.sick,
        casual: empBalance.casual,
        vacation: empBalance.annual,
      };
    }

    saveRequests(requests);
    memoryLeaveRequestsCache = null;

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "leave_requests", requestId), {
          ...request,
        }, { merge: true });
        if (updatedBalance && request.employeeId) {
          await setDoc(doc(db, "leave_balances", request.employeeId), updatedBalance, { merge: true });
        }
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.UPDATE, `leave_requests/${requestId}`);
        }
        console.warn("[leaveService] Firestore update status notice:", err.message);
      }
    }

    await auditService.logAudit({
      actor: reviewerName,
      role: "HR",
      module: "Leave Management",
      action: `${status} Leave Request`,
      target: `${request.employeeName} • ${request.leaveType} (${request.daysCount} days)`,
      oldValue: "Pending",
      newValue: status,
      status: status === LEAVE_STATUS.APPROVED ? "success" : "neutral",
    });

    activityNotificationService.addNotification({
      title: `Leave Request ${status}`,
      message: `${reviewerName} ${status.toLowerCase()} ${request.employeeName}'s ${request.leaveType} leave (${request.daysCount} days).`,
      actor: { name: reviewerName, role: "HR" },
      actorRole: "HR",
      targetAudience: "ALL",
      type: "leave",
      link: "/leave",
    });

    return request;
  },

  /**
   * Tab 09 PDF Feature: HR Manual Leave Balance Adjustment with Compulsory Audit Log
   */
  async adjustEmployeeBalance({ employeeId, employeeName, leaveType = "annual", delta = 0, reason = "", actor = "Aaliyah Patel" }) {
    if (!reason || reason.trim().length < 3) {
      throw new Error("A mandatory reason is required for manual leave balance adjustments.");
    }
    const key = leaveType.toLowerCase().includes("sick")
      ? "sick"
      : leaveType.toLowerCase().includes("casual")
      ? "casual"
      : "annual";

    const balances = getBalances();
    const currentEmpBal = {
      ...(balances[employeeId] || {
        annual: LEAVE_QUOTAS.ANNUAL,
        sick: LEAVE_QUOTAS.SICK,
        casual: LEAVE_QUOTAS.CASUAL,
      }),
    };

    const oldVal = Number(currentEmpBal[key] ?? 0);
    const newVal = Math.max(0, Math.min(365, oldVal + Number(delta)));
    currentEmpBal[key] = newVal;
    if (key === "annual") currentEmpBal.vacation = newVal;

    balances[employeeId] = currentEmpBal;
    saveBalances(balances);

    const firestoreBal = {
      annual: Number(currentEmpBal.annual ?? 14),
      sick: Number(currentEmpBal.sick ?? 8),
      casual: Number(currentEmpBal.casual ?? 10),
      vacation: Number(currentEmpBal.annual ?? 14),
    };

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "leave_balances", employeeId), firestoreBal, { merge: true });
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.UPDATE, `leave_balances/${employeeId}`);
        }
      }
    }

    await auditService.logAudit({
      actor,
      role: "HR",
      module: "Leave Policy",
      action: `Manual Leave Balance Adjustment (${key.toUpperCase()})`,
      target: `${employeeName || employeeId}: ${reason.trim()}`,
      oldValue: `${oldVal} days`,
      newValue: `${newVal} days (${Number(delta) >= 0 ? `+${delta}` : delta})`,
      status: "info",
    });

    return currentEmpBal;
  },

  async getLeaveStats() {
    const requests = await this.getAllRequests();
    const pending = requests.filter((r) => r.status === LEAVE_STATUS.PENDING).length;
    const approved = requests.filter((r) => r.status === LEAVE_STATUS.APPROVED).length;
    const rejected = requests.filter((r) => r.status === LEAVE_STATUS.REJECTED).length;
    return { pending, approved, rejected, total: requests.length };
  },

  async deleteRequest(requestId) {
    const requests = getRequests();
    const target = requests.find((r) => r.id === requestId);
    if (!target) return false;

    if (target.status === LEAVE_STATUS.APPROVED && target.leaveType !== "Unpaid") {
      const balances = getBalances();
      const empBalance = balances[target.employeeId] || {
        annual: LEAVE_QUOTAS.ANNUAL,
        sick: LEAVE_QUOTAS.SICK,
        casual: LEAVE_QUOTAS.CASUAL,
      };

      const typeKey = target.leaveType.toLowerCase().includes("sick")
        ? "sick"
        : target.leaveType.toLowerCase().includes("casual")
        ? "casual"
        : "annual";

      empBalance[typeKey] = (empBalance[typeKey] || 0) + (target.daysCount || 0);
      empBalance.vacation = empBalance.annual;
      balances[target.employeeId] = empBalance;
      saveBalances(balances);

      if (isLiveFirebaseConfigured && db && auth?.currentUser && target.employeeId) {
        try {
          const { doc, setDoc } = await import("firebase/firestore");
          await setDoc(doc(db, "leave_balances", target.employeeId), {
            annual: empBalance.annual,
            sick: empBalance.sick,
            casual: empBalance.casual,
            vacation: empBalance.annual,
          }, { merge: true });
        } catch (err) {
          if (isPermissionError(err)) {
            handleFirestoreError(err, OperationType.UPDATE, `leave_balances/${target.employeeId}`);
          }
        }
      }
    }

    const filtered = requests.filter((r) => r.id !== requestId);
    saveRequests(filtered);
    memoryLeaveRequestsCache = null;

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "leave_requests", requestId));
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.DELETE, `leave_requests/${requestId}`);
        }
      }
    }

    return true;
  },
};
