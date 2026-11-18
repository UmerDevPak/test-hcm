import { auth, db, isLiveFirebaseConfigured } from "./client";

let cachedUid = null;
let cachedRole = "EMPLOYEE";
let cachedEmployeeId = null;
let cacheTimestamp = 0;
const ROLE_CACHE_TTL_MS = 15000;

export function clearFirebaseRoleCache() {
  cachedUid = null;
  cachedRole = "EMPLOYEE";
  cachedEmployeeId = null;
  cacheTimestamp = 0;
}

function normalizeFirebaseRole(raw) {
  const upper = String(raw || "").trim().toUpperCase();
  if (upper === "ADMIN" || upper === "SUPER_ADMIN") return "ADMIN";
  if (
    upper === "HR" ||
    upper === "HR_MANAGER" ||
    upper === "HR_ADMIN" ||
    upper === "MANAGER" ||
    upper === "DEPARTMENT_MANAGER"
  ) {
    return "HR";
  }
  return "EMPLOYEE";
}

export async function getLiveUserAccess() {
  if (!isLiveFirebaseConfigured || !db || !auth?.currentUser) {
    return {
      isAdmin: false,
      isHrOrAdmin: false,
      role: "EMPLOYEE",
      employeeId: null,
      hasProfile: false,
    };
  }

  const fbUser = auth.currentUser;

  if (
    fbUser.email?.toLowerCase() === "umerraza92261988@gmail.com" &&
    fbUser.emailVerified === true
  ) {
    return {
      isAdmin: true,
      isHrOrAdmin: true,
      role: "ADMIN",
      employeeId: "EMP-001",
      hasProfile: true,
    };
  }

  const now = Date.now();
  if (cachedUid === fbUser.uid && now - cacheTimestamp < ROLE_CACHE_TTL_MS) {
    return {
      isAdmin: cachedRole === "ADMIN",
      isHrOrAdmin: cachedRole === "ADMIN" || cachedRole === "HR",
      role: cachedRole,
      employeeId: cachedEmployeeId,
      hasProfile: true,
    };
  }

  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "users", fbUser.uid));
    if (snap.exists()) {
      const data = snap.data();
      const role = normalizeFirebaseRole(data?.role);
      cachedUid = fbUser.uid;
      cachedRole = role;
      cachedEmployeeId = data?.employeeId || null;
      cacheTimestamp = now;
      return {
        isAdmin: role === "ADMIN",
        isHrOrAdmin: role === "ADMIN" || role === "HR",
        role,
        employeeId: cachedEmployeeId,
        hasProfile: true,
      };
    }
  } catch {
    // Fallback to restricted scope if profile cannot be read yet
  }

  return {
    isAdmin: false,
    isHrOrAdmin: false,
    role: "EMPLOYEE",
    employeeId: null,
    hasProfile: false,
  };
}

export async function isLiveUserHrOrAdmin() {
  const access = await getLiveUserAccess();
  return access.isHrOrAdmin;
}
