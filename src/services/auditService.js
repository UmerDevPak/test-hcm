import { isLiveFirebaseConfigured, db, auth } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { isLiveUserHrOrAdmin } from "@/lib/firebase/roleCheck";

const STORAGE_KEY = "hcm_lite_audit_logs";

const BASELINE_AUDIT_LOGS = [
  {
    id: "AUD-BASE-01",
    actor: "Sarah Connor",
    role: "ADMIN",
    module: "HCM Setup",
    action: "Initialized 10-Tab HCM Setup",
    target: "Shifts (4), Attendance Rule, Late/OT Policies & Salary Setup",
    oldValue: "Static Defaults",
    newValue: "v1 Effective 2026-01-01",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: "success",
  },
  {
    id: "AUD-BASE-02",
    actor: "Aaliyah Patel",
    role: "HR",
    module: "Device Setup",
    action: "Synced Biometric Attendance Logs",
    target: "Main Gate - HQ SpeedFace (DEV-01)",
    oldValue: "138 logs",
    newValue: "142 logs synced",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: "info",
  },
];

function getLocalAuditLogs() {
  if (typeof window === "undefined") return BASELINE_AUDIT_LOGS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(BASELINE_AUDIT_LOGS));
    return BASELINE_AUDIT_LOGS;
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : BASELINE_AUDIT_LOGS;
  } catch {
    return BASELINE_AUDIT_LOGS;
  }
}

function saveLocalAuditLogs(list) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 150)));
  }
}

let memoryAuditCache = null;
let lastAuditFetch = 0;

export function formatRelativeTimestamp(isoStr) {
  if (!isoStr) return "Just now";
  const ts = new Date(isoStr).getTime();
  if (isNaN(ts)) return isoStr;
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const auditService = {
  peekCachedLogs() {
    return memoryAuditCache ? [...memoryAuditCache] : null;
  },

  async getAuditLogs(limitCount = 50, forceRefresh = false) {
    if (!forceRefresh && memoryAuditCache && Date.now() - lastAuditFetch < 60000) {
      return memoryAuditCache.slice(0, limitCount);
    }

    let list = getLocalAuditLogs();

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const canRead = await isLiveUserHrOrAdmin();
        if (canRead) {
          const { collection, getDocs } = await import("firebase/firestore");
          const snap = await Promise.race([
            getDocs(collection(db, "audit_logs")),
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
        }
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.LIST, "audit_logs");
        }
        console.warn("[auditService] Firestore read notice:", err.message);
      }
    }

    list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    saveLocalAuditLogs(list);
    memoryAuditCache = list;
    lastAuditFetch = Date.now();
    return list.slice(0, limitCount);
  },

  async logAudit({
    actor = "System",
    role = "ADMIN",
    module = "System",
    action = "",
    target = "",
    oldValue = "",
    newValue = "",
    status = "info",
  }) {
    const entry = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actor: String(actor || "System").slice(0, 120),
      role: String(role || "ADMIN").slice(0, 40),
      module: String(module || "System").slice(0, 80),
      action: String(action || "Updated Record").slice(0, 200),
      target: String(target || "—").slice(0, 250),
      oldValue: String(oldValue ?? "").slice(0, 500),
      newValue: String(newValue ?? "").slice(0, 500),
      status: ["success", "info", "warning", "neutral"].includes(status) ? status : "info",
      timestamp: new Date().toISOString(),
    };

    const list = getLocalAuditLogs();
    const updated = [entry, ...list].slice(0, 150);
    saveLocalAuditLogs(updated);
    memoryAuditCache = updated;
    lastAuditFetch = Date.now();

    // Non-blocking detached background sync to Firestore
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      import("firebase/firestore")
        .then(async ({ doc, setDoc }) => {
          try {
            const canWrite = await isLiveUserHrOrAdmin();
            if (canWrite) {
              await setDoc(doc(db, "audit_logs", entry.id), entry);
            }
          } catch (err) {
            console.warn("[auditService] Firestore log write notice:", err.message);
          }
        })
        .catch(() => {});
    }

    return entry;
  },
};
