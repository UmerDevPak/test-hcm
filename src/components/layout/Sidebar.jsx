"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Users,
  CheckSquare,
  Clock,
  Calendar,
  CreditCard,
  BarChart3,
  FileText,
  Briefcase,
  MessageSquareWarning,
  LogOut,
  User,
  X,
  Loader2,
  Building2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABELS, normalizeRole } from "@/lib/constants";
import { preloadRoute } from "@/lib/routePreloader";
import { cn } from "@/lib/utils";

export function Sidebar({ isOpen, onClose, pendingHref, onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signOut } = useAuth();

  const prefetchRoute = React.useCallback(
    (href) => {
      if (!href) return;
      preloadRoute(href, router);
    },
    [router]
  );

  const handleLinkClick = (href) => {
    if (onNavigate) {
      onNavigate(href);
    } else if (onClose) {
      onClose();
    }
  };

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "hcm_logout_popup",
          JSON.stringify({
            title: "Signed Out Successfully",
            message: "Your HCM Lite session has been closed and local cache cleared.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })
        );
      }
      await signOut();
      router.push("/login");
    } catch (e) {
      console.error("Sign out error", e);
    }
  };

  const adminNavigation = [
    {
      group: "Executive Command",
      items: [
        { name: "Overview", href: "/admin", icon: LayoutDashboard },
        { name: "Organization Setup", href: "/settings", icon: Settings },
        { name: "All Employees", href: "/employees", icon: Users },
      ],
    },
    {
      group: "Workforce & Operations",
      items: [
        { name: "Tasks & OKRs", href: "/tasks", icon: CheckSquare },
        { name: "Company Attendance", href: "/attendance", icon: Clock },
        { name: "Leaves & Absence", href: "/leave", icon: Calendar },
        { name: "Finalize Payroll", href: "/payroll", icon: CreditCard },
      ],
    },
    {
      group: "Compliance & Audit",
      items: [
        { name: "Reports & Audit Log", href: "/reports", icon: BarChart3 },
        { name: "Recruitment", href: "/recruitment", icon: Briefcase },
        { name: "Documents & Contracts", href: "/documents", icon: FileText },
        { name: "Complaints", href: "/complaints", icon: MessageSquareWarning },
      ],
    },
  ];

  const hrNavigation = [
    {
      group: "HR Operations",
      items: [
        { name: "HR Command Center", href: "/hr", icon: LayoutDashboard },
        { name: "Employee Directory", href: "/employees", icon: Users },
        { name: "Attendance & Biometrics", href: "/attendance", icon: Clock },
        { name: "Leave Approvals", href: "/leave", icon: Calendar },
      ],
    },
    {
      group: "Payroll & Talent",
      items: [
        { name: "Prepare Payroll Draft", href: "/payroll", icon: CreditCard },
        { name: "Recruitment", href: "/recruitment", icon: Briefcase },
        { name: "Tasks & OKRs", href: "/tasks", icon: CheckSquare },
      ],
    },
    {
      group: "People & Records",
      items: [
        { name: "Documents & Contracts", href: "/documents", icon: FileText },
        { name: "Complaints & Grievances", href: "/complaints", icon: MessageSquareWarning },
        { name: "My Profile", href: "/profile", icon: User },
      ],
    },
  ];

  const employeeNavigation = [
    {
      group: "Self-Service Portal",
      items: [
        { name: "My Workspace", href: "/employee", icon: LayoutDashboard },
        { name: "My Attendance", href: "/attendance", icon: Clock },
        { name: "My Leave Requests", href: "/leave", icon: Calendar },
        { name: "My Payslips", href: "/payroll", icon: CreditCard },
      ],
    },
    {
      group: "Work & Records",
      items: [
        { name: "Tasks & OKRs", href: "/tasks", icon: CheckSquare },
        { name: "Documents", href: "/documents", icon: FileText },
        { name: "Complaints & Helpdesk", href: "/complaints", icon: MessageSquareWarning },
        { name: "People Directory", href: "/employees", icon: Users },
        { name: "My Profile", href: "/profile", icon: User },
      ],
    },
  ];

  const canonicalRole = normalizeRole(user?.role || role);
  const activeUser = user || {
    displayName: canonicalRole === "ADMIN" ? "Sarah Connor" : canonicalRole === "HR" ? "Aaliyah Patel" : "Elena Rostova",
    jobTitle: canonicalRole === "ADMIN" ? "Super Administrator" : canonicalRole === "HR" ? "HR Operations Lead" : "Staff Software Engineer",
    email: canonicalRole === "ADMIN" ? "admin@hcmlite.internal" : canonicalRole === "HR" ? "hr@hcmlite.internal" : "employee@hcmlite.internal",
  };
  const navigation =
    canonicalRole === "ADMIN"
      ? adminNavigation
      : canonicalRole === "HR"
      ? hrNavigation
      : employeeNavigation;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/90 backdrop-blur-md transition-transform duration-200 lg:relative lg:z-40 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* App Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <Link
            href="/dashboard"
            prefetch={false}
            onClick={() => handleLinkClick("/dashboard")}
            className="flex items-center gap-2.5 group touch-manipulation"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-glow group-hover:scale-105 transition-transform shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                HCM Lite
                <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono font-semibold uppercase">
                  V1.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">Enterprise HR Suite</p>
            </div>
          </Link>

          <button
            onClick={onClose}
            aria-label="Close sidebar navigation"
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navigation.map((section) => (
            <div key={section.group}>
              <h4 className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {section.group}
              </h4>
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const activePath = pendingHref || pathname;
                  const isPending = Boolean(
                    pendingHref && pendingHref === item.href && pendingHref !== pathname
                  );
                  const isActive =
                    activePath === item.href ||
                    (item.href !== "/dashboard" &&
                      item.href !== "/admin" &&
                      item.href !== "/hr" &&
                      item.href !== "/employee" &&
                      activePath.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={true}
                      onMouseEnter={() => prefetchRoute(item.href)}
                      onFocus={() => prefetchRoute(item.href)}
                      onTouchStart={() => prefetchRoute(item.href)}
                      onClick={() => handleLinkClick(item.href)}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 touch-manipulation select-none whitespace-nowrap",
                        isActive
                          ? "bg-zinc-100 dark:bg-zinc-800/90 text-indigo-600 dark:text-indigo-400 shadow-subtle font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                        )}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                      {isPending && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User Card */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <Link
                href="/profile"
                prefetch={true}
                onMouseEnter={() => prefetchRoute("/profile")}
                onClick={() => handleLinkClick("/profile")}
                className="flex items-center gap-2.5 flex-1 min-w-0 group touch-manipulation"
                title="View My Profile"
              >
                <Avatar
                  src={user?.avatar || user?.photoURL || activeUser?.avatar || activeUser?.photoURL}
                  name={activeUser?.displayName || user?.displayName || "User"}
                  id={activeUser?.employeeId || user?.uid}
                  email={activeUser?.email || user?.email}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-400 transition-colors">
                    {activeUser?.displayName || user?.displayName || "Sarah Connor"}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {activeUser?.jobTitle || user?.jobTitle || ROLE_LABELS[canonicalRole] || "Super Administrator"}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
