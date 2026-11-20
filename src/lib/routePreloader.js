import { normalizeRole } from "@/lib/constants";
import { employeeService } from "@/services/employeeService";
import { attendanceService } from "@/services/attendanceService";
import { leaveService } from "@/services/leaveService";
import { payrollService } from "@/services/payrollService";
import { reportService } from "@/services/reportService";
import { hcmConfigService } from "@/services/hcmConfigService";
import { correctionService } from "@/services/correctionService";
import { taskService } from "@/services/taskService";
import { complaintService } from "@/services/complaintService";

// Track routes already preloaded (RSC + page JS chunk) in this browser session
const preloadedRoutes = new Set();
const loadedChunkPaths = new Set();
const inFlightRoutePromises = new Map();

let activeQueueToken = 0;
let dataWarmPromise = null;
let lastWarmedKey = null;

export function getRoutesForRole(role) {
  const canonical = normalizeRole(role);

  if (canonical === "ADMIN") {
    return [
      "/admin",
      "/employees",
      "/attendance",
      "/leave",
      "/tasks",
      "/payroll",
      "/reports",
      "/documents",
      "/recruitment",
      "/complaints",
      "/settings",
      "/profile",
    ];
  }

  if (canonical === "HR") {
    return [
      "/hr",
      "/employees",
      "/attendance",
      "/leave",
      "/tasks",
      "/payroll",
      "/documents",
      "/recruitment",
      "/complaints",
      "/profile",
    ];
  }

  return [
    "/employee",
    "/tasks",
    "/attendance",
    "/leave",
    "/payroll",
    "/complaints",
    "/profile",
    "/documents",
    "/employees",
  ];
}

export const ALL_PRELOAD_ROUTES = [
  "/admin",
  "/hr",
  "/employee",
  "/employees",
  "/attendance",
  "/leave",
  "/tasks",
  "/payroll",
  "/reports",
  "/documents",
  "/recruitment",
  "/complaints",
  "/settings",
  "/profile",
];

function isChunkAlreadyInDom(chunkPath) {
  if (typeof document === "undefined") return true;
  if (loadedChunkPaths.has(chunkPath)) return true;

  const scripts = document.scripts || [];
  for (let i = 0; i < scripts.length; i += 1) {
    const src = scripts[i]?.getAttribute("src") || scripts[i]?.src || "";
    if (src && src.includes(chunkPath)) {
      loadedChunkPaths.add(chunkPath);
      return true;
    }
  }
  return false;
}

function loadChunkScript(chunkPath) {
  if (typeof document === "undefined" || isChunkAlreadyInDom(chunkPath)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    loadedChunkPaths.add(chunkPath);
    const script = document.createElement("script");
    script.src = `/_next/${chunkPath}`;
    script.async = true;

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = setTimeout(finish, 12000);
    script.onload = finish;
    script.onerror = () => {
      // Allow retry if transient error occurred
      loadedChunkPaths.delete(chunkPath);
      finish();
    };

    document.head.appendChild(script);
  });
}

function extractRouteChunkPaths(rscText) {
  if (!rscText) return [];
  const matches = rscText.match(/static\/chunks\/app\/[^"'\s\\\]]+?\/(?:page|layout|loading)\.js/g) || [];
  const unique = [];
  const seen = new Set();

  for (const match of matches) {
    // Root app/layout.js is already mounted; prioritize (dashboard) layout/loading + route page chunks
    if (match === "static/chunks/app/layout.js") continue;
    if (!seen.has(match)) {
      seen.add(match);
      unique.push(match);
    }
  }

  // Load layout/loading chunks first if any (e.g. when preloading from /login), then page chunk
  return unique.sort((a, b) => {
    const aIsPage = a.endsWith("/page.js") ? 1 : 0;
    const bIsPage = b.endsWith("/page.js") ? 1 : 0;
    return aIsPage - bIsPage;
  });
}

/**
 * Preloads a single route cleanly in both production (router.prefetch)
 * and development (server RSC compilation + page JS chunk registration into webpack).
 */
export function preloadRoute(route, router) {
  if (typeof window === "undefined" || !route) {
    return Promise.resolve();
  }

  if (preloadedRoutes.has(route)) {
    return Promise.resolve();
  }

  if (inFlightRoutePromises.has(route)) {
    return inFlightRoutePromises.get(route);
  }

  try {
    router?.prefetch?.(route);
  } catch (e) {}

  if (process.env.NODE_ENV !== "development") {
    preloadedRoutes.add(route);
    return Promise.resolve();
  }

  const promise = (async () => {
    try {
      const res = await fetch(route, {
        headers: { RSC: "1" },
        credentials: "same-origin",
      });
      if (!res.ok) return;

      const rscText = await res.text();
      const chunkPaths = extractRouteChunkPaths(rscText);

      for (const chunkPath of chunkPaths) {
        await loadChunkScript(chunkPath);
      }

      preloadedRoutes.add(route);
    } catch (e) {
      // Non-fatal: leave unmarked so hover or next navigation can retry cleanly
    } finally {
      inFlightRoutePromises.delete(route);
    }
  })();

  inFlightRoutePromises.set(route, promise);
  return promise;
}

/**
 * Runs a strictly sequential background queue so routes compile & register
 * one at a time without saturating HTTP sockets or blocking active user clicks.
 */
export function startBackgroundRoutePreload(
  router,
  { role = null, currentPath = "", delayStartMs = 250, stepMs = 120 } = {}
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const queueToken = ++activeQueueToken;
  const targetRoutes = (role ? getRoutesForRole(role) : ALL_PRELOAD_ROUTES).filter(
    (route) => route !== currentPath && !preloadedRoutes.has(route)
  );

  if (targetRoutes.length === 0) {
    return () => {};
  }

  let cancelled = false;
  let timerId = null;

  const sleep = (ms) =>
    new Promise((resolve) => {
      timerId = setTimeout(resolve, ms);
    });

  (async () => {
    if (delayStartMs > 0) {
      await sleep(delayStartMs);
    }

    for (const route of targetRoutes) {
      if (cancelled || queueToken !== activeQueueToken) return;

      while (typeof document !== "undefined" && document.hidden) {
        if (cancelled || queueToken !== activeQueueToken) return;
        await sleep(500);
      }

      if (!preloadedRoutes.has(route)) {
        await preloadRoute(route, router);
      }

      if (cancelled || queueToken !== activeQueueToken) return;
      if (stepMs > 0) {
        await sleep(stepMs);
      }
    }
  })();

  return () => {
    cancelled = true;
    if (timerId) clearTimeout(timerId);
  };
}

export function markRoutePrefetched(route) {
  if (route) preloadedRoutes.add(route);
}

/**
 * Gently pre-warms in-memory service caches after login/dashboard mount so
 * switching to Employees, Attendance, Leave, Payroll, Reports, or Role Portals
 * renders with zero data-loading delay.
 */
export function warmDashboardDataCaches({ role, user } = {}) {
  if (typeof window === "undefined" || !user) return Promise.resolve();

  const canonical = normalizeRole(role || user?.role);
  const warmKey = `${user?.uid || user?.employeeId || "anon"}:${canonical}`;
  if (dataWarmPromise && lastWarmedKey === warmKey) {
    return dataWarmPromise;
  }

  lastWarmedKey = warmKey;
  const employeeId = user?.employeeId || "EMP-001";

  dataWarmPromise = (async () => {
    try {
      await new Promise((r) => setTimeout(r, 150));
      await Promise.allSettled([
        hcmConfigService.getConfig(),
        employeeService.getAllEmployees(),
        attendanceService.getTodayRecords(),
        attendanceService.getStats(),
        leaveService.getAllRequests(),
        leaveService.getEmployeeBalances(employeeId),
        payrollService.getAllPayrollRuns(),
        correctionService.getAllCorrections(),
        taskService.getTasks(),
        complaintService.getComplaints(),
      ]);

      if (canonical === "ADMIN") {
        await Promise.allSettled([
          reportService.getAdminDashboardMetrics(),
          reportService.getExecutiveDashboardMetrics(),
        ]);
      } else if (canonical === "HR") {
        await reportService.getHrDashboardMetrics().catch(() => {});
      } else {
        await reportService.getEmployeeDashboardMetrics(employeeId, user).catch(() => {});
      }
    } catch (e) {
      // Non-fatal background warm-up
    }
  })();

  return dataWarmPromise;
}
