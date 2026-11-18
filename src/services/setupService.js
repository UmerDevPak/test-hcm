import { db, auth, isLiveFirebaseConfigured } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { ROLES } from "@/lib/constants";
import { employeeService } from "./employeeService";
import { resolveAvatar } from "@/lib/avatarSystem";

const STORAGE_SETTINGS = "hcm_lite_company_settings";

export const setupService = {
  /**
   * Checks if company_settings collection is initialized.
   * If empty, returns false indicating first-run setup is required.
   */
  async checkIsCompanyInitialized() {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("hcm_company_initialized");
      if (cached === "true") return true;
    }

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { collection, getDocs, limit, query } = await import("firebase/firestore");
        const q = query(collection(db, "company_settings"), limit(1));
        const snap = await Promise.race([
          getDocs(q),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
        ]);
        const initialized = !snap.empty;
        if (initialized && typeof window !== "undefined") {
          sessionStorage.setItem("hcm_company_initialized", "true");
        }
        return initialized;
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.LIST, "company_settings");
        }
        console.warn("[setupService] Firestore check fallback:", err.message);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_SETTINGS);
      if (!stored) {
        return true;
      }
      try {
        const parsed = JSON.parse(stored);
        return parsed.isInitialized !== false;
      } catch {
        return true;
      }
    }
    return true;
  },

  /**
   * Initializes the Company Profile and creates the first Super Admin.
   */
  async initializeCompany({ companyName, legalEntity, address, ein, currency, adminName, adminEmail, adminPassword }) {
    const settingsPayload = {
      companyName: companyName || "HCM Lite Technologies, Inc.",
      legalEntity: legalEntity || companyName,
      address: address || "100 Market St, San Francisco, CA",
      ein: ein || "94-3829102",
      currency: currency || "USD",
      isInitialized: true,
      setupCompletedAt: new Date().toISOString(),
    };

    const resolvedAvatar = resolveAvatar({ name: adminName || "Super Admin", email: adminEmail, id: "EMP-001" });
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split("T")[0];

    const adminPayload = {
      id: "EMP-001",
      name: adminName || "Super Admin",
      email: adminEmail,
      role: ROLES.ADMIN,
      jobTitle: "Super Administrator",
      department: "Executive",
      status: "Active",
      mustChangePassword: false,
      hireDate: todayDate,
      createdAt: nowIso,
      avatar: resolvedAvatar,
    };

    // If live Firebase is configured, create Auth user and Firestore docs
    if (isLiveFirebaseConfigured && auth && db) {
      try {
        const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
        const { doc, setDoc } = await import("firebase/firestore");

        // 1. Create Super Admin auth credentials
        const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        if (cred.user) {
          await updateProfile(cred.user, { displayName: adminName });
        }

        // 2. Save admin user profile first so subsequent admin rules succeed
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          email: adminEmail,
          displayName: adminName || "Super Admin",
          role: ROLES.ADMIN,
          employeeId: "EMP-001",
          jobTitle: "Super Administrator",
          department: "Executive",
          mustChangePassword: false,
          status: "Active",
          hireDate: todayDate,
          createdAt: nowIso,
          avatar: resolvedAvatar,
        });

        // 3. Save company settings document
        await setDoc(doc(db, "company_settings", "profile"), settingsPayload);

        // 4. Save admin employee directory documents
        const empRecord = { ...adminPayload, uid: cred.user.uid };
        await setDoc(doc(db, "employees", cred.user.uid), empRecord);
        await setDoc(doc(db, "employees", "EMP-001"), empRecord);

        return { success: true, settings: settingsPayload, admin: empRecord };
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.WRITE, "company_settings/profile");
        }
        console.warn("[setupService] Firebase live setup notice:", err.message);
      }
    }

    // Save locally
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settingsPayload));
    }
    await employeeService.createEmployee(adminPayload);

    return { success: true, settings: settingsPayload, admin: adminPayload };
  },

  /**
   * Retrieve persisted company legal profile
   */
  async getCompanyProfile() {
    const defaults = {
      companyName: "HCM Lite Technologies, Inc.",
      legalEntity: "HCM Lite Technologies, Inc.",
      address: "100 Market St, Suite 400, San Francisco, CA 94105",
      ein: "94-3829102",
      currency: "USD ($)",
      isInitialized: true,
    };

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const snap = await Promise.race([
          getDoc(doc(db, "company_settings", "profile")),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
        ]);
        if (snap.exists()) {
          const data = { ...defaults, ...snap.data() };
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(data));
          }
          return data;
        }
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.GET, "company_settings/profile");
        }
      }
    }

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_SETTINGS);
        if (stored) return { ...defaults, ...JSON.parse(stored) };
      } catch {}
    }
    return defaults;
  },

  /**
   * Persist updated company legal profile
   */
  async saveCompanyProfile(payload, actor = "Sarah Connor") {
    const next = {
      companyName: payload.companyName || "HCM Lite Technologies, Inc.",
      legalEntity: payload.legalEntity || payload.companyName || "HCM Lite Technologies, Inc.",
      address: payload.address || "100 Market St, San Francisco, CA",
      ein: payload.ein || "94-3829102",
      currency: payload.currency || "USD ($)",
      isInitialized: true,
      setupCompletedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(next));
    }

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "company_settings", "profile"), next, { merge: true });
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.WRITE, "company_settings/profile");
        }
        console.warn("[setupService] Firestore save profile notice:", err.message);
      }
    }

    const { auditService } = await import("./auditService");
    await auditService.logAudit({
      actor,
      role: "ADMIN",
      module: "Company Legal Profile",
      action: "Updated Company Legal Entity Profile",
      target: `${next.companyName} • EIN ${next.ein}`,
      status: "success",
    });

    return next;
  },

  /**
   * Helper to trigger / reset first-run state for testing
   */
  resetToUninitialized() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify({ isInitialized: false }));
    }
  },
};

