"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ShieldCheck, ArrowRight, Lock, Mail, User, MapPin, Hash } from "lucide-react";
import { setupService } from "@/services/setupService";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function InitialCompanySetupPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(false);

  const [companyName, setCompanyName] = useState("HCM Lite Technologies, Inc.");
  const [legalEntity, setLegalEntity] = useState("HCM Lite Technologies, Inc.");
  const [ein, setEin] = useState("94-3829102");
  const [currency, setCurrency] = useState("USD ($)");
  const [address, setAddress] = useState("100 Market St, Suite 400, San Francisco, CA");

  const [adminName, setAdminName] = useState("Sarah Connor");
  const [adminEmail, setAdminEmail] = useState("admin@hcmlite.internal");
  const [adminPassword, setAdminPassword] = useState("Password123!");
  const [confirmPassword, setConfirmPassword] = useState("Password123!");

  const handleSetup = async (e) => {
    e.preventDefault();
    if (adminPassword.length < 6) {
      notifyError("Password too short", "Password must be at least 6 characters.");
      return;
    }
    if (adminPassword !== confirmPassword) {
      notifyError("Password mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await setupService.initializeCompany({
        companyName,
        legalEntity,
        ein,
        currency,
        address,
        adminName,
        adminEmail,
        adminPassword,
      });

      notifySuccess("Organization Initialized", "Company legal profile and Super Administrator account created.");

      try {
        await signIn(adminEmail, adminPassword, "ADMIN");
      } catch {}

      router.push("/admin");
    } catch (err) {
      notifyError("Setup failed", err.message || "Failed to initialize company tenant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 text-zinc-100 relative overflow-hidden">
      <div className="w-full max-w-2xl space-y-6 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Building2 className="w-3.5 h-3.5" />
            Enterprise Tenant Provisioning
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">
            Initialize HCM Lite
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Configure your organization&apos;s legal identity and provision the primary Super Administrator account.
          </p>
        </div>

        <form onSubmit={handleSetup} className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                1. Company Legal Entity Profile
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <Input
                label="Legal Entity Name"
                value={legalEntity}
                onChange={(e) => setLegalEntity(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Tax ID / EIN"
                icon={Hash}
                value={ein}
                onChange={(e) => setEin(e.target.value)}
                required
              />
              <Input
                label="Payroll Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
              />
              <Input
                label="Headquarters Address"
                icon={MapPin}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                2. Super Administrator Credentials
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                icon={User}
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
              <Input
                label="Admin Email"
                type="email"
                icon={Mail}
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                icon={Lock}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" size="lg" className="flex-1" isLoading={loading} icon={ArrowRight}>
              Complete Setup & Launch Portal
            </Button>
            <Link href="/login">
              <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
