import { isLiveFirebaseConfigured, db, auth } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { isLiveUserHrOrAdmin } from "@/lib/firebase/roleCheck";
import { hcmConfigService } from "./hcmConfigService";
import { auditService } from "./auditService";
import { activityNotificationService } from "./activityNotificationService";

const STORAGE_KEY = "hcm_lite_attendance_corrections";

function todayMinusDays(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

const INITIAL_CORRECTIONS = [
  {
    id: "CORR-101",
    uid: "demo-employee",
    employeeId: "EMP-003",
    employeeName: "Elena Rostova",
    department: "Engineering",
    requestType: "Check-In Correction",
    date: todayMinusDays(1),
    originalTime: "Missing Check-In",
    requestedTime: "09:05 AM",
    requestedClockOut: "06:00 PM",
    workMode: "Office (HQ)",
    reason: "Biometric scanner gate rebooted during morning arrival.",
    status: "Pending",
    appliedAt: todayMinusDays(1),
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    id: "CORR-102",
    uid: "EMP-006",
    employeeId: "EMP-006",
    employeeName: "Lucas Silva",
    department: "Design",
    requestType: "WFH Request",
    date: todayMinusDays(2),
    originalTime: "12:30 PM (Half-Day Flagged)",
    requestedTime: "09:30 AM",
    requestedClockOut: "06:15 PM",
    workMode: "WFH",
    reason: "Completed afternoon client design sprint remotely.",
    status: "Pending",
    appliedAt: todayMinusDays(1),
    reviewedBy: null,
    reviewedAt: null,
  },
];

function getLocalCorrections() {
  if (typeof window === "undefined") return INITIAL_CORRECTIONS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CORRECTIONS));
    return INITIAL_CORRECTIONS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_CORRECTIONS;
  }
}

function saveLocalCorrections(list) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

let memoryCorrectionsCache = null;
let lastCorrectionsFetch = 0;

export const correctionService = {
  peekCachedCorrections({ status = "", employeeId = "" } = {}) {
    if (!memoryCorrectionsCache) return null;
    let list = [...memoryCorrectionsCache];
    if (status) list = list.filter((c) => c.status === status);
    if (employeeId) list = list.filter((c) => c.employeeId === employeeId);
    return list;
  },

  async getAllCorrections({ status = "", employeeId = "" } = {}, forceRefresh = false) {
    let list;
    if (!forceRefresh && memoryCorrectionsCache && Date.now() - lastCorrectionsFetch < 60000) {
      list = [...memoryCorrectionsCache];
    } else {
      list = getLocalCorrections();

      if (isLiveFirebaseConfigured && db && auth?.currentUser) {
        try {
          const { collection, getDocs, query, where } = await import("firebase/firestore");
          const canListAll = await isLiveUserHrOrAdmin();
          const q = canListAll
            ? collection(db, "attendance_corrections")
            : query(
                collection(db, "attendance_corrections"),
                where("uid", "==", auth.currentUser.uid)
              );
          const snap = await Promise.race([
            getDocs(q),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
          ]);
          if (!snap.empty) {
            const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            remote.forEach((rem) => {
              const idx = list.findIndex((l) => l.id === rem.id);
              if (idx !== -1) list[idx] = rem;
              else list.unshift(rem);
            });
          }
        } catch (err) {
          if (isPermissionError(err)) {
            handleFirestoreError(err, OperationType.LIST, "attendance_corrections");
          }
          console.warn("[correctionService] Firestore read notice:", err.message);
        }
      }

      memoryCorrectionsCache = list;
      lastCorrectionsFetch = Date.now();
    }

    let result = [...list];
    if (status) result = result.filter((r) => r.status === status);
    if (employeeId) result = result.filter((r) => r.employeeId === employeeId);
    return result;
  },

  async submitCorrection({
    employeeId,
    employeeName,
    department = "General",
    requestType = "Missing Punch",
    date,
    originalTime = "Missing / Unrecorded",
    requestedTime,
    requestedClockOut = "",
    workMode = "Office (HQ)",
    reason,
  }) {
    if (!reason || reason.trim().length < 3) {
      throw new Error("A compulsory reason is required for attendance corrections per Tab 03 policy.");
    }

    const config = await hcmConfigService.getConfig();
    const attRule = config.attendanceRule || {};

    if (!attRule.allowEmployeeCorrection) {
      throw new Error("Employee attendance correction requests are currently disabled in Attendance Rules.");
    }

    // Check attendance payroll lock
    if (attRule.attendanceLockedUpTo && date <= attRule.attendanceLockedUpTo) {
      throw new Error(
        `Attendance Locked: Records up to ${attRule.attendanceLockedUpTo} are locked by payroll.`
      );
    }

    // Check correction window X days
    const windowDays = Number(attRule.correctionWindowDays || 7);
    const reqDate = new Date(`${date}T12:00:00Z`);
    const today = new Date();
    const ageDays = Math.round((today.getTime() - reqDate.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays > windowDays) {
      throw new Error(
        `Correction Window Expired: Requests must be submitted within ${windowDays} days of the shift date.`
      );
    }

    const newItem = {
      id: `CORR-${Math.floor(1000 + Math.random() * 9000)}`,
      uid: auth?.currentUser?.uid || employeeId,
      employeeId,
      employeeName,
      department,
      requestType,
      date,
      originalTime,
      requestedTime: requestedTime || "09:00 AM",
      requestedClockOut: requestedClockOut || "",
      workMode,
      reason: reason.trim(),
      status: "Pending",
      appliedAt: new Date().toISOString().split("T")[0],
      reviewedBy: null,
      reviewedAt: null,
    };

    const current = getLocalCorrections();
    current.unshift(newItem);
    saveLocalCorrections(current);
    memoryCorrectionsCache = current;
    lastCorrectionsFetch = Date.now();

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "attendance_corrections", newItem.id), newItem);
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.CREATE, `attendance_corrections/${newItem.id}`);
        }
        console.warn("[correctionService] Firestore save notice:", err.message);
      }
    }

    await auditService.logAudit({
      actor: employeeName,
      role: "EMPLOYEE",
      module: "Attendance Corrections",
      action: `Submitted ${requestType}`,
      target: `${date} (${requestedTime}${requestedClockOut ? ` - ${requestedClockOut}` : ""})`,
      status: "info",
    });

    activityNotificationService.addNotification({
      title: `New ${requestType} Request`,
      message: `${employeeName} requested ${requestType} for ${date}: "${reason.trim()}"`,
      actor: { name: employeeName, role: "EMPLOYEE" },
      actorRole: "EMPLOYEE",
      targetAudience: "ADMIN_HR",
      type: "attendance",
      link: "/hr",
    });

    return newItem;
  },

  async reviewCorrection(correctionId, decision, reviewerName = "Aaliyah Patel") {
    const list = getLocalCorrections();
    const idx = list.findIndex((c) => c.id === correctionId);
    if (idx === -1) return null;

    const item = {
      ...list[idx],
      status: decision,
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString().split("T")[0],
    };
    list[idx] = item;
    saveLocalCorrections(list);
    memoryCorrectionsCache = list;
    lastCorrectionsFetch = Date.now();

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "attendance_corrections", correctionId), item, { merge: true });
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.UPDATE, `attendance_corrections/${correctionId}`);
        }
        console.warn("[correctionService] Firestore review update notice:", err.message);
      }
    }

    // If approved, apply directly to actual Attendance records!
    if (decision === "Approved") {
      const { attendanceService } = await import("./attendanceService");
      await attendanceService.applyApprovedCorrection(item);
    }

    await auditService.logAudit({
      actor: reviewerName,
      role: "HR",
      module: "Attendance Corrections",
      action: `${decision} ${item.requestType}`,
      target: `${item.employeeName} (${item.date})`,
      oldValue: "Pending",
      newValue: decision,
      status: decision === "Approved" ? "success" : "neutral",
    });

    activityNotificationService.addNotification({
      title: `${item.requestType} ${decision}`,
      message: `${reviewerName} ${decision.toLowerCase()} ${item.employeeName}'s ${item.requestType} for ${item.date}.`,
      actor: { name: reviewerName, role: "HR" },
      actorRole: "HR",
      targetAudience: "ALL",
      type: "attendance",
      link: "/attendance",
    });

    return item;
  },

  async deleteCorrection(correctionId) {
    const filtered = getLocalCorrections().filter((c) => c.id !== correctionId);
    saveLocalCorrections(filtered);
    memoryCorrectionsCache = filtered;
    lastCorrectionsFetch = Date.now();

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "attendance_corrections", correctionId));
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.DELETE, `attendance_corrections/${correctionId}`);
        }
      }
    }
    return true;
  },
};
