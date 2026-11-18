"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Sun, Moon, Search, Command, LogOut, User, Building2 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { RoleSwitcher } from "./RoleSwitcher";
import { NotificationCenter } from "./NotificationCenter";
import { Avatar } from "@/components/ui/Avatar";

export function Topbar({ onOpenSidebar, onOpenCommandPalette }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("hcm_role_login_flash");
      }
    } catch {}
  }, []);

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

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 px-3 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="lg:hidden p-1.5 sm:p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-1.5 lg:hidden shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-glow">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 hidden min-[400px]:inline whitespace-nowrap">
            HCM Lite
          </span>
        </Link>

        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all w-64 justify-between shrink-0"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="whitespace-nowrap">Search or command...</span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 shrink-0">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <NotificationCenter />
        <RoleSwitcher />

        <Link
          href="/profile"
          aria-label="My Profile"
          title="View Account Profile"
          className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 flex items-center justify-center"
        >
          <Avatar
            src={user?.avatar || user?.photoURL}
            name={user?.displayName || "User"}
            id={user?.uid}
            email={user?.email}
            size="xs"
          />
        </Link>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-1.5 sm:p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors shrink-0"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-600" />
          )}
        </button>

        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out of session"
          className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-900/50 hover:text-rose-600 dark:hover:text-rose-400 text-zinc-400 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
