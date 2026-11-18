"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole } from "@/lib/constants";
import { DashboardRouteSkeleton } from "../loading";

export default function DashboardRootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const role = normalizeRole(user.role);
    if (role === "ADMIN") router.replace("/admin");
    else if (role === "HR") router.replace("/hr");
    else router.replace("/employee");
  }, [user, loading, router]);

  return <DashboardRouteSkeleton />;
}
