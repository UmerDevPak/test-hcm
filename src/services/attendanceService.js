import { INITIAL_ATTENDANCE } from "@/lib/seedData";
import { formatTime } from "@/lib/utils";
import { isLiveFirebaseConfigured, db, auth } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { isLiveUserHrOrAdmin } from "@/lib/firebase/roleCheck";
import { hcmConfigService } from "./hcmConfigService";
import { employeeService } from "./employeeService";
import { auditService } from "./auditService";
import { evaluateDailyAttendance, isDuplicatePunchGap } from "@/lib/hcmEngine";

const STORAGE_KEY = "hcm_lite_attendance";
const LAST_PUNCH_KEY = "hcm_lite_last_punch_ts";

function getLocalAttendance() {
  if (typeof window === "undefined") return INITIAL_ATTENDANCE;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ATTENDANCE));
    return INITIAL_ATTENDANCE;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_ATTENDANCE;
  }
}

function saveLocalAttendance(list) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

function getLastPunchTs(employeeId) {
  if (typeof window === "undefined") return 0;
  try {
    const map = JSON.parse(localStorage.getItem(LAST_PUNCH_KEY) || "{}");
    return Number(map[employeeId] || 0);
  } catch {
    return 0;
  }
}

function setLastPunchTs(employeeId, ts) {
  if (typeof window === "undefined") return;
  try {
    const map = JSON.parse(localStorage.getItem(LAST_PUNCH_KEY) || "{}");
    map[employeeId] = ts;
    localStorage.setItem(LAST_PUNCH_KEY, JSON.stringify(map));
  } catch {}
}

let memoryAllRecordsCache = null;
let lastRecordsFetchTime = 0;
let inFlightRecordsPromise = null;
const CACHE_TTL_MS = 120000;

export const attendanceService = {
  invalidateCache() {
    memoryAllRecordsCache = null;
    lastRecordsFetchTime = 0;
  },

  peekCachedTodayRecords() {
    if (!memoryAllRecordsCache) return null;
    const today = new Date().toISOString().split("T")[0];
    const todayRecs = memoryAllRecordsCache.filter((r) => r.date === today);
    return todayRecs.length ? todayRecs : memoryAllRecordsCache.slice(0, 10);
  },

  async getAllRecords({ employeeId = "", startDate = "", endDate = "" } = {}, forceRefresh = false) {
    const now = Date.now();
    let records;

    if (!forceRefresh && memoryAllRecordsCache && now - lastRecordsFetchTime < CACHE_TTL_MS) {
      records = [...memoryAllRecordsCache];
    } else if (!forceRefresh && inFlightRecordsPromise) {
      records = [...(await inFlightRecordsPromise)];
    } else {
      inFlightRecordsPromise = (async () => {
        const list = [...getLocalAttendance()];

        if (isLiveFirebaseConfigured && db && auth?.currentUser) {
          try {
            const { collection, getDocs, query, where } = await import("firebase/firestore");
            const canListAll = await isLiveUserHrOrAdmin();
            const q = canListAll
              ? query(collection(db, "attendance"))
              : query(collection(db, "attendance"), where("uid", "==", auth.currentUser.uid));
            const snap = await Promise.race([
              getDocs(q),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
            ]);
            if (!snap.empty) {
              const remoteRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              remoteRecords.forEach((rem) => {
                const idx = list.findIndex((loc) => loc.employeeId === rem.employeeId && loc.date === rem.date);
                if (idx !== -1) list[idx] = rem;
                else list.unshift(rem);
              });
            }
          } catch (err) {
            if (isPermissionError(err)) {
              handleFirestoreError(err, OperationType.LIST, "attendance");
            }
            console.warn("[attendanceService] Firestore read fallback:", err.message);
          }
        }

        memoryAllRecordsCache = list;
        lastRecordsFetchTime = Date.now();
        return list;
      })();

      try {
        records = [...(await inFlightRecordsPromise)];
      } finally {
        inFlightRecordsPromise = null;
      }
    }

    let result = [...records];
    if (employeeId) result = result.filter((r) => r.employeeId === employeeId);
    if (startDate) result = result.filter((r) => r.date >= startDate);
    if (endDate) result = result.filter((r) => r.date <= endDate);
    return result;
  },

  async getTodayRecords(forceRefresh = false) {
    const today = new Date().toISOString().split("T")[0];
    const all = await this.getAllRecords({}, forceRefresh);
    const todayOnly = all.filter((r) => r.date === today);
    return todayOnly.length > 0 ? todayOnly : all.slice(0, 8);
  },

  async getEmployeeTodayRecord(employeeId) {
    const today = new Date().toISOString().split("T")[0];
    const records = await this.getAllRecords({ employeeId });
    return records.find((r) => r.employeeId === employeeId && r.date === today) || null;
  },

  async clockIn({ employeeId, employeeName, location = "Office (HQ)", workMode = null }) {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const nowMs = now.getTime();
    const nowStr = formatTime(now);

    // Fast synchronous lookups from cache (0ms)
    const config = hcmConfigService.peekCachedConfig() || DEFAULT_HCM_CONFIG;
    const employee = employeeService.peekEmployeeById(employeeId) || { id: employeeId, name: employeeName };
    const records = memoryAllRecordsCache || getLocalAttendance();

    // Check attendance lock
    if (config?.attendanceRule?.attendanceLockedUpTo && today <= config.attendanceRule.attendanceLockedUpTo) {
      throw new Error(`Attendance Locked: Period up to ${config.attendanceRule.attendanceLockedUpTo} is locked.`);
    }

    // Duplicate punch filter window (Tab 01 / Tab 03)
    const gapMinutes = Number(config?.attendanceRule?.duplicatePunchGapMinutes || 5);
    const prevTs = getLastPunchTs(employeeId);
    if (prevTs && isDuplicatePunchGap({ previousTimestampMs: prevTs, currentTimestampMs: nowMs, gapMinutes })) {
      throw new Error(`Duplicate punch filtered: Please wait ${gapMinutes} minutes between punches.`);
    }

    const existing = records.find((r) => r.employeeId === employeeId && r.date === today);
    if (existing && existing.clockIn) {
      const err = new Error("Duplicate check-in: Attendance record already exists for today");
      err.status = 409;
      throw err;
    }

    const mode = workMode || (location?.toLowerCase().includes("wfh") || location?.toLowerCase().includes("remote") ? "WFH" : location?.toLowerCase().includes("duty") ? "On-Duty" : "Office (HQ)");

    const evalResult = evaluateDailyAttendance({
      config,
      employee: employee || { id: employeeId, name: employeeName },
      date: today,
      clockIn: nowStr,
      clockOut: null,
      workMode: mode,
    });

    const recordToSave = {
      ...(existing || {}),
      id: existing?.id || `ATT-${Date.now().toString().slice(-4)}`,
      uid: existing?.uid || auth?.currentUser?.uid || employeeId,
      employeeId,
      employeeName,
      date: today,
      clockIn: nowStr,
      clockOut: null,
      status: evalResult.status,
      isLate: evalResult.isLate,
      lateMinutes: evalResult.lateMinutes || 0,
      isHalfDay: false,
      overtimeHours: 0,
      overtimeMultiplier: evalResult.overtimeMultiplier || 1.5,
      shiftId: evalResult.shiftId,
      shiftName: evalResult.shiftName,
      totalHours: null,
      location,
    };

    const localList = [...getLocalAttendance()];
    const idx = localList.findIndex((r) => r.employeeId === employeeId && r.date === today);
    if (idx !== -1) localList[idx] = recordToSave;
    else localList.unshift(recordToSave);

    saveLocalAttendance(localList);
    setLastPunchTs(employeeId, nowMs);
    memoryAllRecordsCache = localList;
    lastRecordsFetchTime = Date.now();

    // Detached non-blocking background sync to Firestore
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      import("firebase/firestore")
        .then(({ doc, setDoc }) => {
          setDoc(doc(db, "attendance", `${today}_${employeeId}`), recordToSave, { merge: true }).catch((e) => {
            console.warn("[attendanceService] Firestore clock-in notice:", e.message);
          });
        })
        .catch(() => {});
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_attendance_updated"));
    }

    return recordToSave;
  },

  async clockOut({ employeeId }) {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const nowMs = now.getTime();
    const nowStr = formatTime(now);

    // Fast synchronous lookups from cache (0ms)
    const config = hcmConfigService.peekCachedConfig() || DEFAULT_HCM_CONFIG;
    const employee = employeeService.peekEmployeeById(employeeId);

    const gapMinutes = Number(config?.attendanceRule?.duplicatePunchGapMinutes || 5);
    const prevTs = getLastPunchTs(employeeId);
    if (prevTs && isDuplicatePunchGap({ previousTimestampMs: prevTs, currentTimestampMs: nowMs, gapMinutes })) {
      throw new Error(`Duplicate punch filtered: Please wait ${gapMinutes} minutes before clocking out.`);
    }

    const localList = [...getLocalAttendance()];
    const index = localList.findIndex((r) => r.employeeId === employeeId && r.date === today);
    if (index === -1) return null;

    const record = { ...localList[index] };
    record.clockOut = nowStr;

    const evalResult = evaluateDailyAttendance({
      config,
      employee: employee || { id: employeeId, name: record.employeeName },
      date: today,
      clockIn: record.clockIn,
      clockOut: nowStr,
      workMode: record.location?.toLowerCase().includes("remote") || record.location?.toLowerCase().includes("wfh") ? "WFH" : "Office (HQ)",
    });

    const durationHours = Math.max(0.5, evalResult.hoursWorked || 8.0);
    record.totalHours = `${durationHours} hrs`;
    record.hoursWorked = durationHours;
    record.status = evalResult.status;
    record.isLate = evalResult.isLate;
    record.lateMinutes = evalResult.lateMinutes || 0;
    record.isHalfDay = evalResult.isHalfDay;
    record.overtimeHours = evalResult.overtimeHours || 0;
    record.overtimeMultiplier = evalResult.overtimeMultiplier || 1.5;
    record.shiftId = evalResult.shiftId;
    record.shiftName = evalResult.shiftName;

    localList[index] = record;
    saveLocalAttendance(localList);
    setLastPunchTs(employeeId, nowMs);
    memoryAllRecordsCache = localList;
    lastRecordsFetchTime = Date.now();

    // Detached non-blocking background sync to Firestore
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      import("firebase/firestore")
        .then(({ doc, setDoc }) => {
          setDoc(doc(db, "attendance", `${record.date || today}_${employeeId}`), record, { merge: true }).catch((e) => {
            console.warn("[attendanceService] Firestore clock-out save notice:", e.message);
          });
        })
        .catch(() => {});
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_attendance_updated"));
    }

    return record;
  },

  /**
   * Apply an HR-approved Correction / Missing Punch / WFH / On-Duty / OT Claim
   */
  async applyApprovedCorrection(correction) {
    const [config, employee] = await Promise.all([
      hcmConfigService.getConfig(),
      employeeService.getEmployeeById(correction.employeeId),
    ]);

    const localList = [...getLocalAttendance()];
    const idx = localList.findIndex(
      (r) => r.employeeId === correction.employeeId && r.date === correction.date
    );
    const existing = idx !== -1 ? localList[idx] : null;

    let clockIn = existing?.clockIn || "09:00 AM";
    let clockOut = existing?.clockOut || "06:00 PM";
    if (correction.requestType === "Check-Out Correction") {
      clockOut = correction.requestedTime || "06:00 PM";
    } else {
      clockIn = correction.requestedTime || clockIn;
      if (correction.requestedClockOut) clockOut = correction.requestedClockOut;
    }

    const workMode = correction.requestType.includes("WFH")
      ? "WFH"
      : correction.requestType.includes("On-Duty")
      ? "On-Duty"
      : correction.workMode || "Office (HQ)";

    const evalResult = evaluateDailyAttendance({
      config,
      employee: employee || { id: correction.employeeId, name: correction.employeeName },
      date: correction.date,
      clockIn,
      clockOut,
      workMode,
    });

    const updatedRec = {
      ...(existing || {}),
      id: existing?.id || `ATT-${Date.now().toString().slice(-4)}`,
      uid: existing?.uid || correction.uid || correction.employeeId,
      employeeId: correction.employeeId,
      employeeName: correction.employeeName,
      date: correction.date,
      clockIn,
      clockOut,
      status: evalResult.status,
      isLate: evalResult.isLate,
      lateMinutes: evalResult.lateMinutes || 0,
      isHalfDay: evalResult.isHalfDay,
      hoursWorked: evalResult.hoursWorked || 8,
      totalHours: `${evalResult.hoursWorked || 8} hrs`,
      overtimeHours: evalResult.overtimeHours || 0,
      overtimeMultiplier: evalResult.overtimeMultiplier || 1.5,
      shiftId: evalResult.shiftId,
      shiftName: evalResult.shiftName,
      location: workMode,
      correctedBy: correction.reviewedBy || "HR",
    };

    if (idx !== -1) localList[idx] = updatedRec;
    else localList.unshift(updatedRec);
    saveLocalAttendance(localList);
    this.invalidateCache();

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "attendance", `${correction.date}_${correction.employeeId}`), updatedRec, { merge: true });
      } catch (e) {
        if (isPermissionError(e)) {
          handleFirestoreError(e, OperationType.WRITE, `attendance/${correction.date}_${correction.employeeId}`);
        }
      }
    }

    return updatedRec;
  },

  /**
   * Cross-Cutting PDF Feature: Re-process historical attendance after Shift/Late/OT/Holiday changes
   */
  async reprocessAttendance({ startDate = "", endDate = "", actor = "HR Operations" } = {}) {
    const [config, employees] = await Promise.all([
      hcmConfigService.getConfig(true),
      employeeService.getAllEmployees(),
    ]);
    const localList = [...getLocalAttendance()];
    const lockDate = config?.attendanceRule?.attendanceLockedUpTo || "";
    let updatedCount = 0;

    const reprocessed = localList.map((rec) => {
      if (startDate && rec.date < startDate) return rec;
      if (endDate && rec.date > endDate) return rec;
      if (lockDate && rec.date <= lockDate) return rec;
      if (rec.status === "On Leave" || !rec.clockIn) return rec;

      const emp = employees.find((e) => e.id === rec.employeeId) || { id: rec.employeeId, name: rec.employeeName };
      const evalResult = evaluateDailyAttendance({
        config,
        employee: emp,
        date: rec.date,
        clockIn: rec.clockIn,
        clockOut: rec.clockOut,
        workMode: rec.location?.toLowerCase().includes("wfh") || rec.location?.toLowerCase().includes("remote") ? "WFH" : "Office (HQ)",
      });

      updatedCount++;
      return {
        ...rec,
        status: evalResult.status,
        isLate: evalResult.isLate,
        lateMinutes: evalResult.lateMinutes || 0,
        isHalfDay: evalResult.isHalfDay,
        hoursWorked: evalResult.hoursWorked || rec.hoursWorked || 0,
        totalHours: evalResult.hoursWorked ? `${evalResult.hoursWorked} hrs` : rec.totalHours,
        overtimeHours: evalResult.overtimeHours || 0,
        overtimeMultiplier: evalResult.overtimeMultiplier || 1.5,
        shiftId: evalResult.shiftId,
        shiftName: evalResult.shiftName,
      };
    });

    saveLocalAttendance(reprocessed);
    this.invalidateCache();

    await auditService.logAudit({
      actor,
      role: "HR",
      module: "Attendance Re-Processing",
      action: "Re-processed Attendance Logs Under Updated Policies",
      target: `${updatedCount} records evaluated${lockDate ? ` (skipped locked <= ${lockDate})` : ""}`,
      status: "success",
    });

    return { updatedCount };
  },

  /**
   * Synchronously peek attendance statistics for instant 0ms dashboard/ledger render
   */
  peekCachedAttendanceStats() {
    if (typeof window === "undefined") return null;
    const records = this.peekCachedTodayRecords() || [];
    const employees = employeeService.peekCachedEmployees() || [];
    const totalEmployees = employees.length || 8;
    const present = records.filter((r) => ["Present", "Late", "WFH", "On-Duty", "Holiday Work", "Off-Day Work"].includes(r.status)).length;
    const onLeave = records.filter((r) => r.status === "On Leave").length;
    const late = records.filter((r) => r.isLate || r.status === "Late").length;
    const absent = Math.max(0, totalEmployees - (present + onLeave));

    return {
      totalEmployees,
      present,
      late,
      onLeave,
      absent,
      presentRate: Math.round((present / (totalEmployees || 1)) * 100),
    };
  },

  async getAttendanceStats(existingRecords = null) {
    const [records, employees] = await Promise.all([
      Array.isArray(existingRecords) ? existingRecords : this.getTodayRecords(),
      employeeService.getAllEmployees(),
    ]);

    const totalEmployees = employees.length || 8;
    const present = records.filter((r) => ["Present", "Late", "WFH", "On-Duty", "Holiday Work", "Off-Day Work"].includes(r.status)).length;
    const onLeave = records.filter((r) => r.status === "On Leave").length;
    const late = records.filter((r) => r.isLate || r.status === "Late").length;
    const absent = Math.max(0, totalEmployees - (present + onLeave));

    return {
      totalEmployees,
      present,
      late,
      onLeave,
      absent,
      presentRate: Math.round((present / (totalEmployees || 1)) * 100),
    };
  },
};
