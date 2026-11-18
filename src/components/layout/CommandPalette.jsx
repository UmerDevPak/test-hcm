"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Settings,
  Users,
  Clock,
  Calendar,
  CreditCard,
  BarChart3,
  CheckSquare,
  FileText,
  Briefcase,
  MessageSquareWarning,
  ArrowRight,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole } from "@/lib/constants";
import { employeeService } from "@/services/employeeService";
import { Avatar } from "@/components/ui/Avatar";

export function CommandPalette({ isOpen, onClose }) {
  const router = useRouter();
  const { user, role } = useAuth();
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState([]);

  const canonicalRole = normalizeRole(user?.role || role);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const cached = employeeService.peekCachedEmployees();
    if (cached) {
      setEmployees(cached);
      return;
    }
    employeeService
      .getAllEmployees()
      .then((list) => setEmployees(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, [isOpen]);

  const navItems = [
    { label: "Executive Overview", href: "/admin", icon: LayoutDashboard, roles: ["ADMIN"] },
    { label: "HR Command Center", href: "/hr", icon: LayoutDashboard, roles: ["HR"] },
    { label: "Employee Self-Service", href: "/employee", icon: LayoutDashboard, roles: ["EMPLOYEE"] },
    { label: "Organization Setup (10 Tabs)", href: "/settings", icon: Settings, roles: ["ADMIN"] },
    { label: "Employee Directory", href: "/employees", icon: Users, roles: ["ADMIN", "HR", "EMPLOYEE"] },
    { label: "Attendance & Biometric Logs", href: "/attendance", icon: Clock, roles: ["ADMIN", "HR", "EMPLOYEE"] },
    { label: "Leaves & Absence", href: "/leave", icon: Calendar, roles: ["ADMIN", "HR", "EMPLOYEE"] },
    { label: "Payroll & Payslips", href: "/payroll", icon: CreditCard, roles: ["ADMIN", "HR", "EMPLOYEE"] },
    { label: "Tasks & OKRs", href: "/tasks", icon: CheckSquare, roles: ["ADMIN", "HR", "EMPLOYEE"] },
    { label: "Reports & Audit Log", href: "/reports", icon: BarChart3, roles: ["ADMIN"] },
    { label: "Recruitment & Onboarding", href: "/recruitment", icon: Briefcase, roles: ["ADMIN", "HR"] },
    { label: "Documents & Contracts", href: "/documents", icon: FileText, roles: ["ADMIN", "HR", "EMPLOYEE"] },
    { label: "Complaints & Grievances", href: "/complaints", icon: MessageSquareWarning, roles: ["ADMIN", "HR", "EMPLOYEE"] },
    { label: "My Profile & Settings", href: "/profile", icon: User, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  ].filter((item) => item.roles.includes(canonicalRole));

  const q = query.trim().toLowerCase();
  const filteredNav = navItems.filter((i) => i.label.toLowerCase().includes(q));
  const filteredEmployees = employees
    .filter(
      (emp) =>
        emp.name?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q) ||
        emp.jobTitle?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q)
    )
    .slice(0, 5);

  const navigateTo = (path) => {
    router.push(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-3.5 text-zinc-400" />
          <input
            autoFocus
            type="text"
            placeholder="Search modules, payroll, employees, or leave..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/80 py-3 pl-11 pr-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredNav.length > 0 && (
            <div className="py-1">
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Modules
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => navigateTo(item.href)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                        <span>{item.label}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredEmployees.length > 0 && (
            <div className="py-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                People Directory
              </span>
              <div className="mt-1 space-y-0.5">
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => navigateTo("/employees")}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-left min-w-0 pr-3">
                      <Avatar src={emp.avatar} name={emp.name} id={emp.id} email={emp.email} size="sm" />
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {emp.jobTitle} · {emp.department}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      {emp.id}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredNav.length === 0 && filteredEmployees.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">
              No matching HCM modules or employees found.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
