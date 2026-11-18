"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, ShieldCheck, Users, UserCheck, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LoginSuccessModal() {
  const [loginData, setLoginData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("hcm_role_login_popup");
      if (stored) {
        sessionStorage.removeItem("hcm_role_login_popup");
        const parsed = JSON.parse(stored);
        if (parsed?.role) {
          setLoginData(parsed);
          setIsOpen(true);
          const timer = setTimeout(() => {
            setIsOpen(false);
          }, 3400);
          return () => clearTimeout(timer);
        }
      }
    } catch {}
  }, []);

  if (!isOpen || !loginData) return null;

  const role = (loginData.role || "Employee").toUpperCase();
  const RoleIcon = role === "ADMIN" ? ShieldCheck : role === "HR" ? Users : UserCheck;
  const roleColor =
    role === "ADMIN"
      ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/30"
      : role === "HR"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700/80 bg-zinc-950 p-6 shadow-2xl text-center space-y-4 animate-scale-in">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold tracking-tight text-zinc-100">
            Session Confirmed
          </h3>
          <p className="text-xs text-zinc-400">
            Welcome to HCM Lite Enterprise Suite
          </p>
        </div>

        <div className={`p-3 rounded-xl border flex items-center justify-center gap-2.5 ${roleColor}`}>
          <RoleIcon className="w-4 h-4 shrink-0" />
          <span className="font-semibold text-sm">
            Signed in as <span className="uppercase tracking-wide">{loginData.role}</span>
          </span>
        </div>

        {loginData.name && (
          <div className="text-xs text-zinc-400 pt-1">
            Account: <strong className="text-zinc-200">{loginData.name}</strong>
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full font-semibold text-xs py-2.5"
            icon={ArrowRight}
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
