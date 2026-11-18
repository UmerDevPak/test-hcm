import { isLiveFirebaseConfigured, db, auth } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { isLiveUserHrOrAdmin } from "@/lib/firebase/roleCheck";
import { DEFAULT_HCM_CONFIG, computeDeviceUserPullStatus } from "@/lib/hcmEngine";
import { auditService } from "./auditService";
import { employeeService } from "./employeeService";

const STORAGE_CONFIG_KEY = "hcm_lite_hcm_setup_config";

function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_HCM_CONFIG));
}

function mergeWithDefaults(partial = {}) {
  const base = cloneDefaultConfig();
  return {
    ...base,
    ...partial,
    attendanceRule: { ...base.attendanceRule, ...(partial.attendanceRule || {}) },
    latePolicy: { ...base.latePolicy, ...(partial.latePolicy || {}) },
    overtimePolicy: { ...base.overtimePolicy, ...(partial.overtimePolicy || {}) },
    offHalfDayRule: { ...base.offHalfDayRule, ...(partial.offHalfDayRule || {}) },
    leavePolicy: { ...base.leavePolicy, ...(partial.leavePolicy || {}) },
    salarySetup: { ...base.salarySetup, ...(partial.salarySetup || {}) },
    devices: Array.isArray(partial.devices) && partial.devices.length ? partial.devices : base.devices,
    deviceUsers: Array.isArray(partial.deviceUsers) && partial.deviceUsers.length ? partial.deviceUsers : base.deviceUsers,
    shifts: Array.isArray(partial.shifts) && partial.shifts.length ? partial.shifts : base.shifts,
    holidays: Array.isArray(partial.holidays) && partial.holidays.length ? partial.holidays : base.holidays,
  };
}

function getLocalConfig() {
  if (typeof window === "undefined") return cloneDefaultConfig();
  const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
  if (!raw) {
    const def = cloneDefaultConfig();
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(def));
    return def;
  }
  try {
    return mergeWithDefaults(JSON.parse(raw));
  } catch {
    return cloneDefaultConfig();
  }
}

function saveLocalConfig(config) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  }
}

let memoryConfigCache = null;
let lastConfigFetchTime = 0;
let inFlightConfigPromise = null;
const CONFIG_CACHE_TTL = 120000;

export const hcmConfigService = {
  peekCachedConfig() {
    if (memoryConfigCache) return memoryConfigCache;
    if (typeof window !== "undefined") return getLocalConfig();
    return null;
  },

  invalidateCache() {
    memoryConfigCache = null;
    lastConfigFetchTime = 0;
  },

  async getConfig(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && memoryConfigCache && now - lastConfigFetchTime < CONFIG_CACHE_TTL) {
      return memoryConfigCache;
    }
    if (!forceRefresh && inFlightConfigPromise) {
      return inFlightConfigPromise;
    }

    inFlightConfigPromise = (async () => {
      let config = getLocalConfig();

      if (isLiveFirebaseConfigured && db && auth?.currentUser) {
        try {
          const { doc, getDoc } = await import("firebase/firestore");
          const snap = await Promise.race([
            getDoc(doc(db, "hcm_config", "master")),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
          ]);
          if (snap.exists()) {
            config = mergeWithDefaults(snap.data());
            saveLocalConfig(config);
          }
        } catch (err) {
          if (isPermissionError(err)) {
            handleFirestoreError(err, OperationType.GET, "hcm_config/master");
          }
          console.warn("[hcmConfigService] Firestore read fallback:", err.message);
        }
      }

      memoryConfigCache = config;
      lastConfigFetchTime = Date.now();
      return config;
    })();

    try {
      return await inFlightConfigPromise;
    } finally {
      inFlightConfigPromise = null;
    }
  },

  async saveFullConfig(nextConfig, { actor = "Sarah Connor", role = "ADMIN", module = "HCM Setup", action = "Updated Setup Configuration", target = "Master Policy" } = {}) {
    const prev = await this.getConfig();
    const merged = mergeWithDefaults({
      ...nextConfig,
      version: Number(prev.version || 1) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    });

    saveLocalConfig(merged);
    memoryConfigCache = merged;
    lastConfigFetchTime = Date.now();

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "hcm_config", "master"), merged, { merge: true });
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.WRITE, "hcm_config/master");
        }
        console.warn("[hcmConfigService] Firestore save notice:", err.message);
      }
    }

    await auditService.logAudit({
      actor,
      role,
      module,
      action,
      target,
      oldValue: `v${prev.version || 1}`,
      newValue: `v${merged.version} (Effective ${merged.effectiveFrom})`,
      status: "success",
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_config_updated", { detail: merged }));
    }

    return merged;
  },

  async updateSection(sectionKey, sectionValue, auditMeta = {}) {
    const current = await this.getConfig();
    const nextConfig = {
      ...current,
      [sectionKey]: sectionValue,
    };
    return this.saveFullConfig(nextConfig, {
      module: auditMeta.module || sectionKey,
      action: auditMeta.action || `Updated ${sectionKey}`,
      target: auditMeta.target || sectionKey,
      actor: auditMeta.actor || "Sarah Connor",
      role: auditMeta.role || "ADMIN",
    });
  },

  // --- Tab 01 Device Operations ---
  async saveDevice(devicePayload, actor = "Sarah Connor") {
    const config = await this.getConfig();
    const devices = [...(config.devices || [])];
    const existingIdx = devices.findIndex((d) => d.id === devicePayload.id);

    // Unique serial number check
    const duplicateSerial = devices.find(
      (d) =>
        d.serialNumber?.trim().toLowerCase() === devicePayload.serialNumber?.trim().toLowerCase() &&
        d.id !== devicePayload.id
    );
    if (duplicateSerial) {
      throw new Error(`Duplicate serial number: "${devicePayload.serialNumber}" is already registered on ${duplicateSerial.name}.`);
    }

    if (existingIdx !== -1) {
      devices[existingIdx] = { ...devices[existingIdx], ...devicePayload };
    } else {
      devices.unshift({
        id: devicePayload.id || `DEV-${String(devices.length + 1).padStart(2, "0")}`,
        status: "Online",
        enabled: true,
        lastSeen: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        usersCount: 0,
        logsCount: 0,
        firmware: "v8.4.2-BioPush",
        storageUsedPct: 8,
        lastError: null,
        ...devicePayload,
      });
    }

    return this.updateSection("devices", devices, {
      actor,
      module: "Device Setup",
      action: existingIdx !== -1 ? "Updated Biometric Device" : "Registered Biometric Device",
      target: `${devicePayload.name} (${devicePayload.serialNumber})`,
    });
  },

  async deleteDevice(deviceId, actor = "Sarah Connor") {
    const config = await this.getConfig();
    const target = (config.devices || []).find((d) => d.id === deviceId);
    const filtered = (config.devices || []).filter((d) => d.id !== deviceId);
    return this.updateSection("devices", filtered, {
      actor,
      module: "Device Setup",
      action: "Removed Biometric Device",
      target: target ? `${target.name} (${target.serialNumber})` : deviceId,
    });
  },

  async runDeviceAction(deviceId, actionType, actor = "HR Operations") {
    const config = await this.getConfig();
    const devices = [...(config.devices || [])];
    const idx = devices.findIndex((d) => d.id === deviceId);
    if (idx === -1) throw new Error("Device not found");

    const dev = { ...devices[idx] };
    const nowIso = new Date().toISOString();
    let resultMessage = "";

    if (actionType === "test") {
      dev.status = "Online";
      dev.lastSeen = nowIso;
      dev.lastError = null;
      resultMessage = `Ping OK (12ms) • ${dev.brandModel} ready.`;
    } else if (actionType === "sync_time") {
      dev.lastSeen = nowIso;
      dev.status = "Online";
      resultMessage = `Device clock synchronized to ${dev.timeZone}.`;
    } else if (actionType === "pull_logs") {
      const addedLogs = Math.floor(Math.random() * 6) + 2;
      dev.status = "Online";
      dev.lastSeen = nowIso;
      dev.lastSync = nowIso;
      dev.logsCount = Number(dev.logsCount || 0) + addedLogs;
      dev.lastError = null;
      resultMessage = `Pulled ${addedLogs} new biometric punch logs from ${dev.name}.`;
    } else if (actionType === "toggle") {
      dev.enabled = !dev.enabled;
      dev.status = dev.enabled ? "Online" : "Disabled";
      resultMessage = `Device ${dev.enabled ? "enabled" : "disabled"}.`;
    } else if (actionType === "clear_logs") {
      dev.logsCount = 0;
      dev.storageUsedPct = 4;
      resultMessage = `Cleared archived punch buffer on ${dev.name}.`;
    }

    devices[idx] = dev;
    await this.updateSection("devices", devices, {
      actor,
      role: "HR",
      module: "Device Setup",
      action: `Device Action: ${actionType}`,
      target: `${dev.name} — ${resultMessage}`,
    });

    return { device: dev, message: resultMessage };
  },

  // --- Tab 02: Pull & Map Device Users ---
  async pullUsersFromDevices(selectedDeviceIds = []) {
    const [config, employees] = await Promise.all([
      this.getConfig(),
      employeeService.getAllEmployees(),
    ]);

    const pool = (config.deviceUsers || []).filter((du) =>
      selectedDeviceIds.length === 0 ? true : selectedDeviceIds.includes(du.deviceId)
    );

    return pool.map((du) => {
      const pullStatus = computeDeviceUserPullStatus(du, employees);
      const matchedEmp = employees.find(
        (e) => String(e.deviceUserId || "").trim() === String(du.deviceUserId || "").trim()
      );
      return {
        ...du,
        pullStatus,
        mappedEmployeeId: matchedEmp?.id || null,
        mappedEmployeeName: matchedEmp?.name || null,
      };
    });
  },

  async mapDeviceUserToEmployee({ deviceUserId, employeeId, actor = "Aaliyah Patel" }) {
    const updated = await employeeService.updateEmployee(employeeId, {
      deviceUserId: String(deviceUserId),
    });
    await auditService.logAudit({
      actor,
      role: "HR",
      module: "Employees on Device",
      action: "Linked Biometric ID to Employee",
      target: `Device User #${deviceUserId} → ${updated?.name || employeeId}`,
      status: "success",
    });
    return updated;
  },

  async pushEmployeesToDevices(actor = "Aaliyah Patel") {
    const [config, employees] = await Promise.all([
      this.getConfig(),
      employeeService.getAllEmployees(),
    ]);
    const existingUsers = [...(config.deviceUsers || [])];
    let pushed = 0;

    employees.forEach((emp, i) => {
      const devUid = emp.deviceUserId || String(101 + i);
      if (!existingUsers.some((u) => String(u.deviceUserId) === String(devUid))) {
        existingUsers.push({
          deviceId: config.devices?.[0]?.id || "DEV-01",
          deviceUserId: devUid,
          name: emp.name,
          privilege: emp.role === "ADMIN" ? "Admin" : "User",
          hasFace: true,
          hasFinger: true,
          cardNo: `RFID-9${devUid}`,
          enabled: emp.status !== "Terminated",
        });
        pushed++;
      }
    });

    await this.updateSection("deviceUsers", existingUsers, {
      actor,
      role: "HR",
      module: "Employees on Device",
      action: "Pushed Employee Directory to Biometric Terminals",
      target: `${employees.length} employees synced (${pushed} newly enrolled)`,
    });
    return { total: employees.length, pushed };
  },

  // --- Tab 06 Shifts ---
  async saveShift(shiftPayload, actor = "Sarah Connor") {
    const config = await this.getConfig();
    const shifts = [...(config.shifts || [])];
    const idx = shifts.findIndex((s) => s.id === shiftPayload.id);
    if (idx !== -1) {
      shifts[idx] = { ...shifts[idx], ...shiftPayload };
    } else {
      shifts.push({
        id: shiftPayload.id || `SHF-${Date.now().toString().slice(-4)}`,
        seasonalOverrides: [],
        assignedDepartments: [],
        ...shiftPayload,
      });
    }
    return this.updateSection("shifts", shifts, {
      actor,
      module: "Shifts",
      action: idx !== -1 ? "Updated Shift Template" : "Created Shift Template",
      target: `${shiftPayload.name} (${shiftPayload.startTime}–${shiftPayload.endTime})`,
    });
  },

  async deleteShift(shiftId, actor = "Sarah Connor") {
    const config = await this.getConfig();
    const filtered = (config.shifts || []).filter((s) => s.id !== shiftId);
    return this.updateSection("shifts", filtered, {
      actor,
      module: "Shifts",
      action: "Deleted Shift Template",
      target: shiftId,
    });
  },

  // --- Tab 08 Public Holidays ---
  async saveHoliday(holidayPayload, actor = "Sarah Connor") {
    const config = await this.getConfig();
    const holidays = [...(config.holidays || [])];
    const idx = holidays.findIndex((h) => h.id === holidayPayload.id);
    if (idx !== -1) {
      holidays[idx] = { ...holidays[idx], ...holidayPayload };
    } else {
      holidays.push({
        id: holidayPayload.id || `HOL-${Date.now().toString().slice(-4)}`,
        paid: true,
        applyToBranch: "All Branches",
        applyToDepartment: "All",
        applyToReligion: "All",
        ...holidayPayload,
      });
    }
    holidays.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    return this.updateSection("holidays", holidays, {
      actor,
      module: "Public Holidays",
      action: idx !== -1 ? "Updated Public Holiday" : "Added Public Holiday",
      target: `${holidayPayload.name} (${holidayPayload.date})`,
    });
  },

  async deleteHoliday(holidayId, actor = "Sarah Connor") {
    const config = await this.getConfig();
    const filtered = (config.holidays || []).filter((h) => h.id !== holidayId);
    return this.updateSection("holidays", filtered, {
      actor,
      module: "Public Holidays",
      action: "Deleted Public Holiday",
      target: holidayId,
    });
  },
};
