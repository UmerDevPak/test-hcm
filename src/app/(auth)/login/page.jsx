"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowRight,
  ShieldCheck,
  Users,
  UserCheck,
  Lock,
  Mail,
  CheckCircle2,
  X,
} from "lucide-react";
import EnterpriseVectorHero from "@/components/auth/EnterpriseVectorHero";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEMO_USERS } from "@/services/authService";
import { normalizeRole, ROLE_LABELS } from "@/lib/constants";
import { setupService } from "@/services/setupService";
import { ForcePasswordChangeModal } from "@/components/auth/ForcePasswordChangeModal";
import { isLiveFirebaseConfigured } from "@/lib/firebase/client";
import { startBackgroundRoutePreload } from "@/lib/routePreloader";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signInWithGoogle, switchDemoRole } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [email, setEmail] = useState("admin@hcmlite.internal");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [showForcePasswordModal, setShowForcePasswordModal] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("hcm_logout_popup");
      if (stored) {
        sessionStorage.removeItem("hcm_logout_popup");
        setLogoutNotice(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleSelectRole = (roleId, defaultEmail) => {
    setSelectedRole(roleId);
    setEmail(defaultEmail);
    setPassword("Password123!");
    setLoginError("");
  };

  const getRoleDashboard = (userRole) => {
    const norm = normalizeRole(userRole);
    if (norm === "ADMIN") return "/admin";
    if (norm === "HR") return "/hr";
    return "/employee";
  };

  useEffect(() => {
    if (!authLoading && !loading && user) {
      router.replace(getRoleDashboard(user.role));
    }
  }, [user, authLoading, loading, router]);

  useEffect(() => {
    setupService.checkIsCompanyInitialized().then((isInitialized) => {
      if (!isInitialized) {
        router.push("/setup");
      }
    });
  }, [router]);

  useEffect(() => {
    return startBackgroundRoutePreload(router, {
      delayStartMs: 300,
      stepMs: 120,
    });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    try {
      const authUser = await signIn(email, password, selectedRole);

      if (authUser?.mustChangePassword) {
        setPendingUser(authUser);
        setShowForcePasswordModal(true);
        return;
      }

      const authenticatedRole = normalizeRole(authUser?.role);
      const roleLabel = ROLE_LABELS[authenticatedRole] || "Employee";
      const loginMsg = `Signed in as ${roleLabel}`;
      try {
        sessionStorage.setItem(
          "hcm_role_login_popup",
          JSON.stringify({
            role: roleLabel,
            name: authUser?.displayName || roleLabel,
            email: authUser?.email || email,
            message: loginMsg,
          })
        );
        sessionStorage.setItem(
          "hcm_role_login_flash",
          JSON.stringify({ role: roleLabel, message: loginMsg })
        );
      } catch {}
      notifySuccess("Authentication Success", loginMsg);
      router.push(getRoleDashboard(authenticatedRole));
    } catch (err) {
      const rawMsg = (err.message || "").toLowerCase();
      let errorMsg = "Invalid credentials";

      if (err.message?.startsWith("ROLE_MISMATCH:")) {
        const parts = err.message.split(":");
        const expected = parts[1] || "Selected Role";
        const actual = parts[2] || "Account Role";
        errorMsg = `Role mismatch: This account is registered as "${actual}", but you selected "${expected}". Select "${actual}" to sign in.`;
      } else if (
        rawMsg.includes("invalid-credential") ||
        rawMsg.includes("wrong-password") ||
        rawMsg.includes("user-not-found")
      ) {
        errorMsg = "Invalid credentials. Verify your email and password or select a demo persona.";
      } else if (err.message) {
        errorMsg = err.message;
      }

      setLoginError(errorMsg);
      notifyError("Sign In Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setLoginError("");
    try {
      const authUser = await signInWithGoogle();
      const authenticatedRole = normalizeRole(authUser?.role);
      const roleLabel = ROLE_LABELS[authenticatedRole] || "Employee";
      notifySuccess("Authentication Success", `Signed in via Google as ${roleLabel}`);
      router.push(getRoleDashboard(authenticatedRole));
    } catch (err) {
      const msg = err?.message || "Google Sign-In failed.";
      setLoginError(msg);
      notifyError("Google Sign-In Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoPersona = (demoUser) => {
    const canonical = normalizeRole(demoUser.role);
    setSelectedRole(canonical);
    setEmail(demoUser.email);
    setPassword("Password123!");
    setLoginError("");
  };

  const handlePasswordChanged = async () => {
    setShowForcePasswordModal(false);
    if (pendingUser) {
      switchDemoRole(pendingUser.role);
    }
    const dest = getRoleDashboard(pendingUser?.role);
    notifySuccess("Authentication Success", "Password updated.");
    router.push(dest);
  };

  if (!authLoading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-zinc-500">Redirecting to HCM Lite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex bg-zinc-950 text-zinc-100 overflow-x-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{ backgroundImage: `url('/images/auth-fluid-dark.jpg')` }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/55 to-zinc-950/80 pointer-events-none" />

      {/* Left visual side */}
      <div className="relative z-10 hidden lg:flex lg:w-1/2 flex-col justify-between p-10 xl:p-14 border-r border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-glow">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">HCM Lite</h1>
              <p className="text-xs text-zinc-400">Enterprise Human Capital Management</p>
            </div>
          </div>
          <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono tracking-wider text-zinc-400">
            <span>ATTENDANCE</span>
            <span>·</span>
            <span>LEAVE</span>
            <span>·</span>
            <span>PAYROLL</span>
          </div>
        </div>

        <div className="relative my-auto space-y-4 max-w-xl py-6">
          <div className="absolute -top-10 -left-2 text-6xl xl:text-7xl font-extrabold uppercase tracking-tight text-white/[0.04] select-none pointer-events-none whitespace-nowrap">
            PEOPLE & PAYROLL
          </div>

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-[2px] bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" />
              <span className="text-[11px] font-mono text-indigo-400 tracking-widest uppercase">
                10-Tab Policy Engine
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
              WORKFORCE IN SYNC
            </h1>

            <p className="text-sm xl:text-base text-zinc-300 font-light leading-relaxed max-w-md">
              Configure company shifts, late penalties, biometric hardware punches, holiday-aware leave workflows, and role-governed monthly payroll in one unified suite.
            </p>
          </div>

          <div className="pt-2">
            <EnterpriseVectorHero />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/40 pt-4">
          <span>HCM Lite · Enterprise Workforce Suite</span>
          <span className="font-mono text-indigo-400">v1.0</span>
        </div>
      </div>

      {/* Right Sign-In Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-8 lg:p-12">
        <div className="w-full max-w-lg space-y-5 rounded-2xl sm:rounded-3xl border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-2xl p-5 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 lg:hidden pb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-glow shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-lg tracking-tight text-zinc-100">
                HCM Lite
              </div>
              <p className="text-xs text-zinc-400">Enterprise HR & Payroll Suite</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
              Sign in to HCM Lite
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5">
              Select your organization role to access executive policy setup, HR operations, or employee self-service.
            </p>
          </div>

          {/* Setup Company Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-zinc-200 block truncate">New enterprise tenant?</span>
                <span className="text-[11px] text-zinc-400 block truncate">Initialize legal entity & Super Admin</span>
              </div>
            </div>
            <Link href="/setup" className="shrink-0 ml-2">
              <Button variant="outline" size="sm" className="text-xs h-8 whitespace-nowrap">
                Company Setup
              </Button>
            </Link>
          </div>

          {/* Role Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Select Workspace Role
              </label>
              <span className="text-[10px] text-zinc-500">3-Tier RBAC</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  id: "ADMIN",
                  label: "Admin",
                  desc: "Super Administrator",
                  icon: ShieldCheck,
                  email: "admin@hcmlite.internal",
                  activeBorder: "border-indigo-500 bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/40",
                  activeIcon: "text-indigo-400",
                },
                {
                  id: "HR",
                  label: "HR",
                  desc: "HR Operations",
                  icon: Users,
                  email: "hr@hcmlite.internal",
                  activeBorder: "border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40",
                  activeIcon: "text-emerald-400",
                },
                {
                  id: "EMPLOYEE",
                  label: "Employee",
                  desc: "Self-Service",
                  icon: UserCheck,
                  email: "employee@hcmlite.internal",
                  activeBorder: "border-cyan-500 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/40",
                  activeIcon: "text-cyan-400",
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = selectedRole === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectRole(item.id, item.email)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-150 ${
                      isSelected
                        ? item.activeBorder
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? item.activeIcon : "text-zinc-400"}`} />
                    <span className="font-bold text-xs">{item.label}</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1-Click Demo Personas */}
          <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                Instant Demo Personas
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">1-Click Fill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_USERS.map((u) => {
                const canonical = normalizeRole(u.role);
                const Icon =
                  canonical === "ADMIN" ? ShieldCheck : canonical === "HR" ? Users : UserCheck;
                return (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => handleSelectDemoPersona(u)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-indigo-500/50 hover:bg-zinc-800/80 transition-all text-left text-xs"
                  >
                    <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-200 truncate">{u.displayName}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{u.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {logoutNotice && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-200">{logoutNotice.title}</h4>
                  <p className="text-zinc-300 text-[11px] mt-0.5">{logoutNotice.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogoutNotice(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
                aria-label="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loginError && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/25 text-xs text-rose-300">
              {loginError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Input
              label="Work Email Address"
              type="email"
              icon={Mail}
              placeholder="admin@hcmlite.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <Link href="/signup" className="text-zinc-400 hover:text-zinc-200">
                Create account
              </Link>
              <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={loading} icon={ArrowRight}>
              Sign In
            </Button>

            {isLiveFirebaseConfigured && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                disabled={loading}
                onClick={handleGoogleSignIn}
              >
                Continue with Google
              </Button>
            )}
          </form>
        </div>
      </div>

      <ForcePasswordChangeModal
        isOpen={showForcePasswordModal}
        user={pendingUser}
        onPasswordChanged={handlePasswordChanged}
      />
    </div>
  );
}
