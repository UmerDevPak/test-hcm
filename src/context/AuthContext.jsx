"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, isLiveFirebaseConfigured } from "@/lib/firebase/client";
import { clearFirebaseRoleCache } from "@/lib/firebase/roleCheck";
import {
  DEMO_USERS,
  findDemoUser,
  resolveEmployeeIdFromEmail,
  authService,
} from "@/services/authService";
import { ROLES, normalizeRole } from "@/lib/constants";
import { resolveAvatar } from "@/lib/avatarSystem";

const STORAGE_SESSION = "hcm_lite_session";
const STORAGE_DEMO_UID = "hcm_lite_demo_user_uid";
const STORAGE_REG_USERS = "hcm_lite_registered_users";
const STORAGE_LOGGED_OUT = "hcm_lite_logged_out";

const AuthContext = createContext({
  user: null,
  role: ROLES.EMPLOYEE,
  loading: true,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  switchDemoRole: async () => {},
  updateUserProfile: async () => {},
  isAdmin: false,
  isHR: false,
  isEmployee: false,
  isManager: false,
  isHrOrAdmin: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(STORAGE_SESSION);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => {
    if (typeof window === "undefined") return ROLES.EMPLOYEE;
    try {
      const cached = localStorage.getItem(STORAGE_SESSION);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.role) return normalizeRole(parsed.role);
      }
    } catch {}
    return ROLES.EMPLOYEE;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const cached = localStorage.getItem(STORAGE_SESSION);
      return !cached;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_SESSION);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          setUser(parsed);
          if (parsed.role) setRole(normalizeRole(parsed.role));
          setLoading(false);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLiveFirebaseConfigured && auth) {
      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const profile = await authService.getUserProfile(firebaseUser.uid).catch(() => null);
            const demoMatch = findDemoUser(firebaseUser.email);

            let detectedRole = profile?.role || null;
            if (!detectedRole && typeof window !== "undefined") {
              try {
                const regUsers = JSON.parse(localStorage.getItem(STORAGE_REG_USERS) || "[]");
                const regMatch = regUsers.find(
                  (u) => u.email?.toLowerCase() === (firebaseUser.email || "").toLowerCase()
                );
                if (regMatch?.role) detectedRole = regMatch.role;
              } catch {}
            }

            if (!detectedRole && demoMatch?.role) {
              detectedRole = demoMatch.role;
            }

            if (!detectedRole) {
              const emailLower = (firebaseUser.email || "").toLowerCase();
              if (emailLower === "umerraza92261988@gmail.com" || emailLower.startsWith("admin@")) {
                detectedRole = "ADMIN";
              } else if (emailLower.startsWith("hr@") || emailLower.startsWith("manager@")) {
                detectedRole = "HR";
              } else {
                detectedRole = ROLES.EMPLOYEE;
              }
            }

            const activeRole = normalizeRole(detectedRole);
            const expectedRole =
              typeof window !== "undefined" ? sessionStorage.getItem("hcm_expected_role") : null;
            if (expectedRole && activeRole !== normalizeRole(expectedRole)) {
              try {
                const { signOut: fbSignOut } = await import("firebase/auth");
                await fbSignOut(auth);
              } catch {}
              setUser(null);
              setRole(null);
              setLoading(false);
              return;
            }

            const activeDisplayName =
              profile?.displayName ||
              firebaseUser.displayName ||
              demoMatch?.displayName ||
              (activeRole === "ADMIN"
                ? "Sarah Connor"
                : activeRole === "HR"
                ? "Aaliyah Patel"
                : "Elena Rostova");

            const activeEmployeeId =
              profile?.employeeId ||
              demoMatch?.employeeId ||
              resolveEmployeeIdFromEmail(firebaseUser.email, activeRole);

            const effectiveAvatar = resolveAvatar({
              src: profile?.avatar || firebaseUser.photoURL || demoMatch?.avatar,
              name: activeDisplayName,
              email: firebaseUser.email,
              id: activeEmployeeId || firebaseUser.uid,
            });

            const userObj = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: activeDisplayName,
              photoURL: effectiveAvatar,
              avatar: effectiveAvatar,
              role: activeRole,
              employeeId: activeEmployeeId,
              department:
                profile?.department ||
                demoMatch?.department ||
                (activeRole === "ADMIN"
                  ? "Executive"
                  : activeRole === "HR"
                  ? "Human Resources"
                  : "Engineering"),
              jobTitle:
                profile?.jobTitle ||
                demoMatch?.jobTitle ||
                (activeRole === "ADMIN"
                  ? "Super Administrator"
                  : activeRole === "HR"
                  ? "HR Operations Lead"
                  : "Staff Software Engineer"),
              mustChangePassword: Boolean(profile?.mustChangePassword),
            };

            if (!profile && db && firebaseUser.email) {
              try {
                const { doc, setDoc } = await import("firebase/firestore");
                await setDoc(doc(db, "users", firebaseUser.uid), {
                  ...userObj,
                  status: "Active",
                  createdAt: new Date().toISOString(),
                });
                clearFirebaseRoleCache();
              } catch {}
            }

            setUser(userObj);
            setRole(activeRole);
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_SESSION, JSON.stringify(userObj));
              localStorage.setItem(STORAGE_DEMO_UID, firebaseUser.uid);
              localStorage.removeItem(STORAGE_LOGGED_OUT);
            }
          } catch (err) {
            console.warn("[AuthContext] profile resolution notice:", err);
          }
        } else {
          const savedDemoUid =
            typeof window !== "undefined" ? localStorage.getItem(STORAGE_DEMO_UID) : null;
          const loggedOut =
            typeof window !== "undefined" ? localStorage.getItem(STORAGE_LOGGED_OUT) : null;
          const matchedDemo =
            !loggedOut && savedDemoUid ? DEMO_USERS.find((u) => u.uid === savedDemoUid) : null;

          if (matchedDemo) {
            const canonical = normalizeRole(matchedDemo.role);
            setUser({ ...matchedDemo, photoURL: matchedDemo.avatar, role: canonical });
            setRole(canonical);
          } else {
            setUser(null);
            setRole(null);
            if (typeof window !== "undefined") {
              localStorage.removeItem(STORAGE_SESSION);
            }
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      const savedUid = typeof window !== "undefined" ? localStorage.getItem(STORAGE_DEMO_UID) : null;
      let matched = null;

      if (typeof window !== "undefined") {
        try {
          const registered = JSON.parse(localStorage.getItem(STORAGE_REG_USERS) || "[]");
          matched = registered.find((u) => u.uid === savedUid);
        } catch {}
      }

      if (!matched && savedUid) {
        matched = DEMO_USERS.find((u) => u.uid === savedUid);
      }

      if (matched) {
        const canonical = normalizeRole(matched.role);
        const resolved = resolveAvatar({
          src: matched.avatar,
          name: matched.displayName,
          email: matched.email,
          id: matched.employeeId || matched.uid,
        });
        setUser({ ...matched, avatar: resolved, photoURL: resolved, role: canonical });
        setRole(canonical);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    }
  }, []);

  const switchDemoRole = async (newRole) => {
    const canonical = normalizeRole(newRole);
    const matched = DEMO_USERS.find((u) => normalizeRole(u.role) === canonical) || DEMO_USERS[0];
    const resolved = resolveAvatar({
      src: matched.avatar,
      name: matched.displayName,
      email: matched.email,
      id: matched.employeeId || matched.uid,
    });
    const sessionUser = { ...matched, avatar: resolved, photoURL: resolved, role: canonical };
    setUser(sessionUser);
    setRole(canonical);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify(sessionUser));
      localStorage.setItem(STORAGE_DEMO_UID, matched.uid);
      localStorage.removeItem(STORAGE_LOGGED_OUT);
    }
  };

  const signIn = async (email, password, requiredRole = null) => {
    setLoading(true);
    try {
      if (requiredRole && typeof window !== "undefined") {
        sessionStorage.setItem("hcm_expected_role", normalizeRole(requiredRole));
      }
      const authResult = await authService.signInWithEmailPassword(email, password);
      const normalizedRole = normalizeRole(authResult.role);

      if (requiredRole) {
        const expected = normalizeRole(requiredRole);
        if (normalizedRole !== expected) {
          try {
            if (isLiveFirebaseConfigured && auth) {
              const { signOut: fbSignOut } = await import("firebase/auth");
              await fbSignOut(auth);
            }
          } catch {}
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("hcm_expected_role");
            localStorage.removeItem(STORAGE_SESSION);
            localStorage.removeItem(STORAGE_DEMO_UID);
            localStorage.setItem(STORAGE_LOGGED_OUT, "true");
          }
          setUser(null);
          setRole(null);

          const roleLabels = { ADMIN: "Admin", HR: "HR", EMPLOYEE: "Employee" };
          throw new Error(
            `ROLE_MISMATCH:${roleLabels[expected] || expected}:${roleLabels[normalizedRole] || normalizedRole}`
          );
        }
      }

      const updatedUser = { ...authResult, role: normalizedRole };
      setUser(updatedUser);
      setRole(normalizedRole);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("hcm_expected_role");
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(updatedUser));
        localStorage.setItem(STORAGE_DEMO_UID, authResult.uid);
        localStorage.removeItem(STORAGE_LOGGED_OUT);
      }
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const authResult = await authService.signInWithGoogle();
      const normalizedRole = normalizeRole(authResult.role);
      const updatedUser = { ...authResult, role: normalizedRole };
      setUser(updatedUser);
      setRole(normalizedRole);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("hcm_expected_role");
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(updatedUser));
        localStorage.setItem(STORAGE_DEMO_UID, authResult.uid);
        localStorage.removeItem(STORAGE_LOGGED_OUT);
      }
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (formData) => {
    setLoading(true);
    try {
      const authResult = await authService.signUpWithEmailPassword(formData);
      const normalizedRole = normalizeRole(authResult.role);
      const updatedUser = { ...authResult, role: normalizedRole };
      setUser(updatedUser);
      setRole(normalizedRole);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(updatedUser));
        localStorage.setItem(STORAGE_DEMO_UID, authResult.uid);
        localStorage.removeItem(STORAGE_LOGGED_OUT);
      }
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_SESSION);
        localStorage.removeItem(STORAGE_DEMO_UID);
        localStorage.setItem(STORAGE_LOGGED_OUT, "true");
      }
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!updates || typeof updates !== "object") return;

    let updatedUser = null;
    setUser((prev) => {
      const base = prev || {};
      updatedUser = {
        ...base,
        ...updates,
        avatar: updates.avatar || updates.photoURL || base.avatar,
        photoURL: updates.photoURL || updates.avatar || base.photoURL,
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_SESSION, JSON.stringify(updatedUser));
          window.dispatchEvent(
            new CustomEvent("hcm_user_profile_updated", { detail: updatedUser })
          );
        } catch {}
      }
      return updatedUser;
    });

    const targetEmail = user?.email || updatedUser?.email;
    const targetUid = user?.uid || updatedUser?.uid;
    const demoUser = DEMO_USERS.find(
      (u) =>
        (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase()) ||
        (targetUid && u.uid === targetUid)
    );
    if (demoUser && updates.avatar) {
      demoUser.avatar = updates.avatar;
      demoUser.photoURL = updates.avatar;
    }

    const effectiveUid = auth?.currentUser?.uid || user?.uid;
    if (isLiveFirebaseConfigured && db && effectiveUid) {
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(
          doc(db, "users", effectiveUid),
          {
            ...updates,
            avatar: updates.avatar || updates.photoURL,
            photoURL: updates.photoURL || updates.avatar,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("[AuthContext] updateUserProfile Firestore notice:", err.message);
      }
    }

    return updatedUser;
  };

  const currentRoleCanonical = normalizeRole(user?.role || role);
  const isAdmin = currentRoleCanonical === "ADMIN";
  const isHR = currentRoleCanonical === "HR";
  const isEmployee = currentRoleCanonical === "EMPLOYEE";
  const isHrOrAdmin = isAdmin || isHR;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRoleCanonical,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        switchDemoRole,
        updateUserProfile,
        isAdmin,
        isHR,
        isEmployee,
        isManager: isHrOrAdmin,
        isHrOrAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
