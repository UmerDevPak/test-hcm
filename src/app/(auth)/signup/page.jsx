"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight, UserCheck, Mail, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ROLES, DEPARTMENTS, normalizeRole, ROLE_LABELS } from "@/lib/constants";

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading: authLoading, signUp } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    role: ROLES.EMPLOYEE,
    department: "Engineering",
    jobTitle: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      const norm = normalizeRole(user.role);
      const dest = norm === "ADMIN" ? "/admin" : norm === "HR" ? "/hr" : "/employee";
      router.replace(dest);
    }
  }, [user, authLoading, router]);

  const roleOptions = [
    { value: ROLES.ADMIN, label: "Admin (Super Administrator)" },
    { value: ROLES.HR, label: "HR (HR Operations)" },
    { value: ROLES.EMPLOYEE, label: "Employee (Self-Service)" },
  ];

  const departmentOptions = DEPARTMENTS.map((dept) => ({
    value: dept,
    label: dept,
  }));

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.displayName.trim() || !formData.email.trim()) {
      setFormError("Full Name and Work Email are required.");
      return;
    }
    if (formData.password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: formData.email.trim(),
        password: formData.password,
        displayName: formData.displayName.trim(),
        role: formData.role,
        department: formData.department,
        jobTitle: formData.jobTitle.trim() || ROLE_LABELS[normalizeRole(formData.role)],
      });

      const canonical = normalizeRole(formData.role);
      const roleLabel = ROLE_LABELS[canonical] || "Employee";
      notifySuccess("Account Created", `Signed in as ${roleLabel}`);

      const dest =
        canonical === "ADMIN" ? "/admin" : canonical === "HR" ? "/hr" : "/employee";
      router.push(dest);
    } catch (err) {
      const msg = err.message || "Failed to create account.";
      setFormError(msg);
      notifyError("Registration Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user) return null;

  return (
    <div className="relative min-h-screen flex bg-zinc-950 text-zinc-100 overflow-x-hidden">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/images/auth-fluid-dark.jpg')` }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/55 to-zinc-950/80 pointer-events-none" />

      <div className="relative z-10 hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-glow">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">HCM Lite</h1>
            <p className="text-xs text-zinc-400">Enterprise Human Capital Management</p>
          </div>
        </div>

        <div className="my-auto space-y-5 max-w-lg">
          <h2 className="text-4xl font-black tracking-tight text-white leading-tight">
            ONBOARD YOUR WORKFORCE
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Provision role-governed accounts for Super Administrators, HR operations leads, and employees with live Firebase persistence.
          </p>
          <div className="space-y-2.5 text-sm text-zinc-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>10-Tab Policy Configuration & Shift Roster Engine</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Biometric Device Attendance & Holiday-Aware Leave Workflows</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>HR Payroll Draft Preparation & Admin Final Lock</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-zinc-400 border-t border-zinc-800/40 pt-4">
          HCM Lite · Multi-Role Enterprise HR & Payroll Platform
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg space-y-5 rounded-2xl sm:rounded-3xl border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Create your account</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Provision an HCM Lite profile with designated department and role access.
            </p>
          </div>

          {formError && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/25 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              icon={UserCheck}
              placeholder="e.g. Jordan Lee"
              value={formData.displayName}
              onChange={(e) => handleChange("displayName", e.target.value)}
              required
            />

            <Input
              label="Work Email Address"
              type="email"
              icon={Mail}
              placeholder="jordan@hcmlite.internal"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Workspace Role"
                options={roleOptions}
                value={formData.role}
                onChange={(e) => handleChange("role", e.target.value)}
                required
              />

              <Select
                label="Department"
                options={departmentOptions}
                value={formData.department}
                onChange={(e) => handleChange("department", e.target.value)}
                required
              />
            </div>

            <Input
              label="Job Title"
              type="text"
              placeholder="e.g. People Operations Specialist"
              value={formData.jobTitle}
              onChange={(e) => handleChange("jobTitle", e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              icon={Lock}
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              required
            />

            <Button type="submit" className="w-full" size="lg" isLoading={loading} icon={ArrowRight}>
              Create Account
            </Button>

            <div className="text-center pt-1 text-xs text-zinc-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}