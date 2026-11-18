"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Clock,
  Calendar,
  CreditCard,
  Settings,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { activityNotificationService } from "@/services/activityNotificationService";
import { normalizeRole } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const { user, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [showSimulator, setShowSimulator] = useState(false);
  const panelRef = useRef(null);

  const canonicalRole = normalizeRole(user?.role || role || "ADMIN");

  const loadNotifications = () => {
    const list = activityNotificationService.getNotifications(canonicalRole);
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener("hcm_activity_notification_updated", handleUpdate);
    return () => window.removeEventListener("hcm_activity_notification_updated", handleUpdate);
  }, [canonicalRole]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowSimulator(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    activityNotificationService.markAllAsRead();
    loadNotifications();
  };

  const handleMarkOneRead = (id) => {
    activityNotificationService.markAsRead(id);
    loadNotifications();
  };

  const handleSimulate = (actionKey) => {
    activityNotificationService.simulateAction(actionKey);
    loadNotifications();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "ALL") return true;
    return n.actorRole === activeTab;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case "attendance":
        return <Clock className="w-3.5 h-3.5 text-cyan-400" />;
      case "leave":
        return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
      case "payroll":
        return <CreditCard className="w-3.5 h-3.5 text-emerald-400" />;
      case "policy":
        return <Settings className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="HCM Activity Notifications"
        title="Workforce & Policy Notifications"
        className={cn(
          "relative p-2 rounded-lg border transition-all duration-150",
          isOpen
            ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/20"
            : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
        )}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-mono font-bold text-white ring-2 ring-white dark:ring-zinc-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => {
            setIsOpen(false);
            setShowSimulator(false);
          }}
        />
      )}

      {isOpen && (
        <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-96 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 shadow-2xl backdrop-blur-xl z-50 animate-scale-in flex flex-col max-h-[80vh] sm:max-h-[85vh] overflow-hidden">
          <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                HCM Activity Stream
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-mono">
                    {unreadCount} new
                  </span>
                )}
              </h4>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSimulator(!showSimulator)}
                title="Simulate HCM Event"
                className={cn(
                  "p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap",
                  showSimulator
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-zinc-500 hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Test Event</span>
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[10px] transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {showSimulator && (
            <div className="p-3 border-b border-indigo-500/20 bg-indigo-950/20 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  onClick={() => handleSimulate("ADMIN_POLICY_UPDATE")}
                  className="p-1.5 rounded-lg border border-indigo-500/30 bg-zinc-900/90 hover:bg-indigo-900/40 text-left truncate text-indigo-300 transition-colors"
                >
                  Update 10-Tab Policy
                </button>
                <button
                  onClick={() => handleSimulate("HR_DEVICE_SYNC")}
                  className="p-1.5 rounded-lg border border-cyan-500/30 bg-zinc-900/90 hover:bg-cyan-900/40 text-left truncate text-cyan-300 transition-colors"
                >
                  Sync Biometric Punches
                </button>
                <button
                  onClick={() => handleSimulate("HR_PAYROLL_DRAFT")}
                  className="col-span-2 p-1.5 rounded-lg border border-emerald-500/30 bg-zinc-900/90 hover:bg-emerald-900/40 text-left truncate text-emerald-300 transition-colors"
                >
                  Submit Payroll Draft for Lock
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 p-2 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto scrollbar-none bg-zinc-50/30 dark:bg-zinc-900/20 text-[11px]">
            {[
              { id: "ALL", label: "All" },
              { id: "ADMIN", label: "Admin" },
              { id: "HR", label: "HR" },
              { id: "EMPLOYEE", label: "Employee" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all duration-150 shrink-0",
                  activeTab === tab.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[380px]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-zinc-600 stroke-[1.5]" />
                <p className="text-xs font-medium">No activity notifications yet</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkOneRead(notif.id)}
                  className={cn(
                    "p-3.5 transition-colors relative flex items-start gap-3 text-left cursor-pointer",
                    notif.isRead
                      ? "hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-400 opacity-85 hover:opacity-100"
                      : "bg-indigo-50/20 dark:bg-indigo-950/20 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 text-zinc-200"
                  )}
                >
                  <div className="mt-0.5 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono text-zinc-400 truncate">
                        {notif.actorRole} · {notif.actor?.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap font-mono">
                        {formatRelativeTime(notif.timestamp)}
                      </span>
                    </div>

                    <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 leading-snug">
                      {notif.title}
                    </h5>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    {notif.link && (
                      <div className="pt-1">
                        <Link
                          href={notif.link}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkOneRead(notif.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
