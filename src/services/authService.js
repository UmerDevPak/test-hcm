import { auth, db, isLiveFirebaseConfigured } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { clearFirebaseRoleCache } from "@/lib/firebase/roleCheck";
import { ROLES, normalizeRole } from "@/lib/constants";
import { CORE_PERSONA_AVATARS, resolveAvatar } from "@/lib/avatarSystem";

const STORAGE_REG_USERS = "hcm_lite_registered_users";
const STORAGE_DEMO_UID = "hcm_lite_demo_user_uid";

export const DEMO_USERS = [
  {
    uid: "demo-admin",
    employeeId: "EMP-001",
    email: "admin@hcmlite.internal",
    aliases: ["sarah.connor@hcmlite.internal", "admin@adpulsesem.internal"],
    displayName: "Sarah Connor",
    role: "ADMIN",
    department: "Executive",
    jobTitle: "Super Administrator",
    mustChangePassword: false,
    avatar: CORE_PERSONA_AVATARS["EMP-001"],
  },
  {
    uid: "demo-hr",
    employeeId: "EMP-005",
    email: "hr@hcmlite.internal",
    aliases: ["aaliyah.patel@hcmlite.internal", "manager@adpulsesem.internal"],
    displayName: "Aaliyah Patel",
    role: "HR",
    department: "Human Resources",
    jobTitle: "HR Operations Lead",
    mustChangePassword: false,
    avatar: CORE_PERSONA_AVATARS["EMP-005"],
  },
  {
    uid: "demo-employee",
    employeeId: "EMP-003",
    email: "employee@hcmlite.internal",
    aliases: ["elena.rostova@hcmlite.internal", "client@adpulsesem.internal"],
    displayName: "Elena Rostova",
    role: "EMPLOYEE",
    department: "Engineering",
    jobTitle: "Staff Software Engineer",
    mustChangePassword: false,
    avatar: CORE_PERSONA_AVATARS["EMP-003"],
  },
];

export function findDemoUser(email = "") {
  const clean = String(email).trim().toLowerCase();
  return DEMO_USERS.find(
    (u) =>
      u.email.toLowerCase() === clean ||
      (Array.isArray(u.aliases) && u.aliases.some((a) => a.toLowerCase() === clean))
  );
}

export function resolveEmployeeIdFromEmail(email = "", role = "EMPLOYEE") {
  const demo = findDemoUser(email);
  if (demo?.employeeId) return demo.employeeId;
  const norm = normalizeRole(role);
  if (norm === "ADMIN") return "EMP-001";
  if (norm === "HR") return "EMP-005";
  return "EMP-003";
}

export const authService = {
  async signUpWithEmailPassword({
    email,
    password,
    displayName,
    role = ROLES.EMPLOYEE,
    department = "Engineering",
    jobTitle = "Team Member",
  }) {
    const cleanEmail = email.trim().toLowerCase();
    const assignedRole = normalizeRole(role);
    const cleanDisplayName = displayName?.trim() || cleanEmail.split("@")[0];
    const employeeId = resolveEmployeeIdFromEmail(cleanEmail, assignedRole);

    if (isLiveFirebaseConfigured && auth) {
      try {
        const { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } =
          await import("firebase/auth");
        let cred;
        try {
          cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        } catch (createErr) {
          if (createErr.code === "auth/email-already-in-use") {
            cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          } else {
            throw createErr;
          }
        }

        if (cleanDisplayName && cred.user) {
          await updateProfile(cred.user, { displayName: cleanDisplayName });
        }

        const assignedAvatar = resolveAvatar({
          name: cleanDisplayName,
          email: cleanEmail,
          id: cred.user.uid,
        });

        const userProfile = {
          uid: cred.user.uid,
          email: cred.user.email || cleanEmail,
          displayName: cleanDisplayName,
          role: assignedRole,
          employeeId,
          department: department || "Engineering",
          jobTitle:
            jobTitle ||
            (assignedRole === "ADMIN"
              ? "Super Administrator"
              : assignedRole === "HR"
              ? "HR Manager"
              : "Team Member"),
          mustChangePassword: false,
          status: "Active",
          createdAt: new Date().toISOString(),
          avatar: assignedAvatar,
        };

        if (db) {
          try {
            const { doc, setDoc } = await import("firebase/firestore");
            await setDoc(doc(db, "users", cred.user.uid), userProfile);
          } catch (dbErr) {
            if (isPermissionError(dbErr)) {
              handleFirestoreError(dbErr, OperationType.WRITE, `users/${cred.user.uid}`);
            }
          }
        }

        return userProfile;
      } catch (err) {
        if (err.code === "auth/wrong-password") {
          throw new Error("This email is already registered with a different password.");
        }
        throw new Error(err.message || "Failed to create account with Firebase");
      }
    }

    const newId = `usr_${Date.now()}`;
    const localUser = {
      uid: newId,
      email: cleanEmail,
      displayName: cleanDisplayName,
      role: assignedRole,
      employeeId,
      department: department || "Engineering",
      jobTitle: jobTitle || "Team Member",
      mustChangePassword: false,
      status: "Active",
      avatar: resolveAvatar({ name: cleanDisplayName, email: cleanEmail, id: newId }),
    };

    if (typeof window !== "undefined") {
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_REG_USERS) || "[]");
        existing.push(localUser);
        localStorage.setItem(STORAGE_REG_USERS, JSON.stringify(existing));
        localStorage.setItem(STORAGE_DEMO_UID, localUser.uid);
      } catch {}
    }

    return localUser;
  },

  async signInWithEmailPassword(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const demoMatch = findDemoUser(cleanEmail);

    if (isLiveFirebaseConfigured && auth) {
      try {
        clearFirebaseRoleCache();
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);

        let profileData = null;
        if (db) {
          try {
            const { doc, getDoc } = await import("firebase/firestore");
            const userSnap = await getDoc(doc(db, "users", cred.user.uid));
            if (userSnap.exists()) {
              profileData = userSnap.data();
            }
          } catch (dbErr) {
            if (isPermissionError(dbErr)) {
              handleFirestoreError(dbErr, OperationType.GET, `users/${cred.user.uid}`);
            }
          }
        }

        let detectedRole = profileData?.role || demoMatch?.role || null;
        if (!detectedRole && typeof window !== "undefined") {
          try {
            const regUsers = JSON.parse(localStorage.getItem(STORAGE_REG_USERS) || "[]");
            const regMatch = regUsers.find((u) => u.email?.toLowerCase() === cleanEmail);
            if (regMatch?.role) detectedRole = regMatch.role;
          } catch {}
        }

        if (!detectedRole) {
          if (cleanEmail.startsWith("admin@") || cleanEmail === "umerraza92261988@gmail.com") {
            detectedRole = "ADMIN";
          } else if (cleanEmail.startsWith("hr@") || cleanEmail.startsWith("manager@")) {
            detectedRole = "HR";
          } else {
            detectedRole = "EMPLOYEE";
          }
        }

        const assignedRole = normalizeRole(detectedRole);
        const resolvedName =
          profileData?.displayName ||
          demoMatch?.displayName ||
          cred.user.displayName ||
          cleanEmail.split("@")[0];
        const resolvedEmployeeId =
          profileData?.employeeId ||
          demoMatch?.employeeId ||
          resolveEmployeeIdFromEmail(cleanEmail, assignedRole);

        const resolvedAvatar = resolveAvatar({
          src: profileData?.avatar || demoMatch?.avatar || cred.user.photoURL,
          name: resolvedName,
          email: cleanEmail,
          id: resolvedEmployeeId || cred.user.uid,
        });

        const resultUser = {
          uid: cred.user.uid,
          email: cred.user.email || cleanEmail,
          displayName: resolvedName,
          role: assignedRole,
          employeeId: resolvedEmployeeId,
          department:
            profileData?.department ||
            demoMatch?.department ||
            (assignedRole === "ADMIN"
              ? "Executive"
              : assignedRole === "HR"
              ? "Human Resources"
              : "Engineering"),
          jobTitle:
            profileData?.jobTitle ||
            demoMatch?.jobTitle ||
            (assignedRole === "ADMIN"
              ? "Super Administrator"
              : assignedRole === "HR"
              ? "HR Operations Lead"
              : "Staff Software Engineer"),
          mustChangePassword: Boolean(profileData?.mustChangePassword),
          avatar: resolvedAvatar,
        };

        if (db && !profileData) {
          try {
            const { doc, setDoc } = await import("firebase/firestore");
            await setDoc(doc(db, "users", cred.user.uid), {
              ...resultUser,
              status: "Active",
              createdAt: new Date().toISOString(),
            });
            clearFirebaseRoleCache();
          } catch {}
        }

        return resultUser;
      } catch (err) {
        if (demoMatch && password === "Password123!") {
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_DEMO_UID, demoMatch.uid);
          }
          return demoMatch;
        }
        throw new Error(err.message || "Invalid credentials. Please verify your email and password.");
      }
    }

    if (typeof window !== "undefined") {
      try {
        const registered = JSON.parse(localStorage.getItem(STORAGE_REG_USERS) || "[]");
        const matchedRegistered = registered.find((u) => u.email.toLowerCase() === cleanEmail);
        if (matchedRegistered) {
          localStorage.setItem(STORAGE_DEMO_UID, matchedRegistered.uid);
          return matchedRegistered;
        }
      } catch {}
    }

    if (demoMatch) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_DEMO_UID, demoMatch.uid);
      }
      return demoMatch;
    }

    throw new Error(
      `No HCM Lite account found for "${email}". Select one of the Instant Demo Personas or sign up.`
    );
  },

  async getUserProfile(uid) {
    if (isLiveFirebaseConfigured && db && uid) {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          return snap.data();
        }
      } catch {}
    }
    return null;
  },

  async changePassword(userId, newPassword) {
    if (isLiveFirebaseConfigured && auth?.currentUser) {
      const { updatePassword } = await import("firebase/auth");
      await updatePassword(auth.currentUser, newPassword);
      if (db) {
        try {
          const { doc, updateDoc } = await import("firebase/firestore");
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            mustChangePassword: false,
            status: "Active",
          });
        } catch (e) {
          if (isPermissionError(e)) {
            handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
          }
        }
      }
      return true;
    }

    const matched = DEMO_USERS.find((u) => u.uid === userId);
    if (matched) matched.mustChangePassword = false;
    return true;
  },

  async signOut() {
    clearFirebaseRoleCache();
    if (isLiveFirebaseConfigured && auth) {
      try {
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
      } catch {}
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_DEMO_UID);
    }
    return true;
  },

  async signInWithGoogle() {
    if (!isLiveFirebaseConfigured || !auth) {
      throw new Error("Live Firebase is not configured for Google Sign-In.");
    }

    clearFirebaseRoleCache();
    const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const cred = await signInWithPopup(auth, provider);
    const fbUser = cred.user;
    const cleanEmail = (fbUser.email || "").trim().toLowerCase();

    let profileData = null;
    if (db) {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const userSnap = await getDoc(doc(db, "users", fbUser.uid));
        if (userSnap.exists()) {
          profileData = userSnap.data();
        }
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
        }
      }
    }

    let detectedRole = profileData?.role || null;
    if (!detectedRole) {
      if (cleanEmail === "umerraza92261988@gmail.com" || cleanEmail.startsWith("admin@")) {
        detectedRole = ROLES.ADMIN;
      } else if (cleanEmail.startsWith("hr@")) {
        detectedRole = ROLES.HR;
      } else {
        detectedRole = ROLES.EMPLOYEE;
      }
    }

    const assignedRole = normalizeRole(detectedRole);
    const resolvedName =
      profileData?.displayName || fbUser.displayName || cleanEmail.split("@")[0] || "Team Member";
    const resolvedEmployeeId =
      profileData?.employeeId || resolveEmployeeIdFromEmail(cleanEmail, assignedRole);
    const resolvedAvatar = resolveAvatar({
      src: profileData?.avatar || fbUser.photoURL,
      name: resolvedName,
      email: cleanEmail,
      id: resolvedEmployeeId || fbUser.uid,
    });

    const userProfile = {
      uid: fbUser.uid,
      email: fbUser.email || cleanEmail,
      displayName: resolvedName,
      role: assignedRole,
      employeeId: resolvedEmployeeId,
      department:
        profileData?.department ||
        (assignedRole === "ADMIN" ? "Executive" : assignedRole === "HR" ? "Human Resources" : "Engineering"),
      jobTitle:
        profileData?.jobTitle ||
        (assignedRole === "ADMIN" ? "Super Administrator" : assignedRole === "HR" ? "HR Manager" : "Employee"),
      mustChangePassword: false,
      status: "Active",
      avatar: resolvedAvatar,
      createdAt: profileData?.createdAt || new Date().toISOString(),
    };

    if (db && !profileData) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "users", fbUser.uid), userProfile, { merge: true });
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
        }
      }
    }

    return userProfile;
  },

  async resetPassword(email) {
    if (isLiveFirebaseConfigured && auth) {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
      return true;
    }
    return true;
  },
};
