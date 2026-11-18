"use client";

import React, { useState, useEffect } from "react";
import { Shield, Mail, Building2, Check, BadgeCheck, Award, Crown, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { employeeService } from "@/services/employeeService";
import { RankBadge } from "@/components/performance/RankBadge";
import { ALL_AVATAR_PRESETS } from "@/lib/avatarSystem";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, normalizeRole } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const { notifySuccess } = useNotification();
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || user?.photoURL || null);
  const [employeeRecord, setEmployeeRecord] = useState(null);

  const canonicalRole = normalizeRole(user?.role);

  useEffect(() => {
    if (user?.avatar || user?.photoURL) {
      setSelectedAvatar(user?.avatar || user?.photoURL);
    }
    const empId = user?.employeeId || user?.uid || "EMP-001";
    employeeService.getEmployeeById(empId).then((res) => {
      if (res) setEmployeeRecord(res);
    });
  }, [user]);

  const handleSelectAvatar = async (preset) => {
    setSelectedAvatar(preset.dataUri);
    try {
      if (updateUserProfile) {
        await updateUserProfile({
          avatar: preset.dataUri,
          photoURL: preset.dataUri,
        });
      } else {
        const raw = localStorage.getItem("hcm_lite_session");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.avatar = preset.dataUri;
          parsed.photoURL = preset.dataUri;
          localStorage.setItem("hcm_lite_session", JSON.stringify(parsed));
        }
      }
    } catch {}
    notifySuccess("Profile Avatar Updated", `Switched portrait to ${preset.label}.`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          My Account & Role Scope
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          View your authenticated HCM Lite identity, department assignment, and portrait preset.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-6">
          <Avatar
            src={selectedAvatar || user?.avatar}
            name={user?.displayName || "HCM User"}
            email={user?.email}
            id={user?.uid}
            size="xl"
          />
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-zinc-100">{user?.displayName}</h2>
              <Badge variant="info" size="sm">
                {ROLE_LABELS[canonicalRole]}
              </Badge>
              <RankBadge rank={employeeRecord?.ranking || "Rank A"} size="sm" showTier />
            </div>
            <p className="text-xs text-zinc-400">{ROLE_DESCRIPTIONS[canonicalRole]}</p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                {user?.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                Department: {user?.department || "Executive"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-indigo-400" />
                ID: {user?.employeeId || "EMP-001"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                {user?.jobTitle || ROLE_LABELS[canonicalRole]}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Talent Tier & Score Standing Card */}
      <Card className="border-indigo-500/20 bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/20">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Performance Standing & Career Tier
                </h3>
                <p className="text-xs text-zinc-400">
                  Dynamic categorization based on sprint throughput velocity and workplace conduct.
                </p>
              </div>
            </div>
            <RankBadge rank={employeeRecord?.ranking || "Rank A"} size="md" showTier />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/40 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-200">Work Output & Delivery</span>
                <span className="font-mono font-bold text-indigo-400">{employeeRecord?.workScore ?? 95}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${employeeRecord?.workScore ?? 95}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400">
                Measures sprint tickets completed, task delivery SLAs, and punctual clock-ins.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/40 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-200">Behavior & Team Conduct</span>
                <span className="font-mono font-bold text-emerald-400">{employeeRecord?.behaviorScore ?? 95}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${employeeRecord?.behaviorScore ?? 95}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400">
                Measures peer collaboration, problem ownership, communication, and mentoring.
              </p>
            </div>
          </div>

          {employeeRecord?.promotionHistory && employeeRecord.promotionHistory.length > 0 && (
            <div className="pt-3 border-t border-zinc-800/80">
              <span className="text-xs font-semibold text-zinc-300 block mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Promotion & Tier Advancement History
              </span>
              <div className="space-y-1.5">
                {employeeRecord.promotionHistory.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-mono text-[11px]">{formatDate(h.promotedAt)}</span>
                      <RankBadge rank={h.toRank} size="xs" />
                    </div>
                    <span className="text-[11px] text-zinc-300 truncate max-w-xs">{h.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Vector Portrait Presets</CardTitle>
            <CardDescription>Choose an illustrated avatar for your HCM Lite employee profile</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ALL_AVATAR_PRESETS.map((preset) => {
              const isSelected = (selectedAvatar || user?.avatar) === preset.dataUri;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectAvatar(preset)}
                  className={`relative rounded-xl border p-3 flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <img
                    src={preset.dataUri}
                    alt={preset.label}
                    className="w-14 h-14 rounded-full"
                  />
                  <span className="text-[11px] font-medium text-zinc-300 text-center">
                    {preset.label.split(" (")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}