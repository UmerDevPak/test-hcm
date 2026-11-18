const STORAGE_KEY = "hcm_lite_activity_notifications_v1";

export const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-hcm-001",
    title: "Biometric Terminal Offline Alert",
    message: "Warehouse Gate (ZK-WH-03) missed heartbeat window. Verify LAN/ADMS sync status.",
    actor: { name: "Sarah Connor", role: "ADMIN", email: "admin@hcmlite.internal" },
    actorRole: "ADMIN",
    targetAudience: "ADMIN_HR",
    type: "attendance",
    priority: "high",
    isRead: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    link: "/hr",
  },
  {
    id: "notif-hcm-002",
    title: "Leave Request Submitted",
    message: "Elena Rostova requested 3 days of Annual Leave (Nov 23 – Nov 27, holidays auto-skipped).",
    actor: { name: "Elena Rostova", role: "EMPLOYEE", email: "elena.rostova@hcmlite.internal" },
    actorRole: "EMPLOYEE",
    targetAudience: "ADMIN_HR",
    type: "leave",
    priority: "normal",
    isRead: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    link: "/leave",
  },
  {
    id: "notif-hcm-003",
    title: "10-Tab HCM Policy Synchronized",
    message: "Super Administrator updated Tab 04 Late Policy (15m grace, 3 lates = 0.5d penalty) and Tab 10 Payroll Basis.",
    actor: { name: "Sarah Connor", role: "ADMIN", email: "admin@hcmlite.internal" },
    actorRole: "ADMIN",
    targetAudience: "ALL",
    type: "policy",
    priority: "normal",
    isRead: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 105).toISOString(),
    link: "/settings",
  },
  {
    id: "notif-hcm-004",
    title: "Monthly Payroll Finalized & Locked",
    message: "Finalized payslips have been published to employee self-service portals.",
    actor: { name: "Sarah Connor", role: "ADMIN", email: "admin@hcmlite.internal" },
    actorRole: "ADMIN",
    targetAudience: "ALL",
    type: "payroll",
    priority: "normal",
    isRead: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    link: "/payroll",
  },
];

function getStoredNotifications() {
  if (typeof window === "undefined") return INITIAL_NOTIFICATIONS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
    return INITIAL_NOTIFICATIONS;
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : INITIAL_NOTIFICATIONS;
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

function saveNotifications(list) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("hcm_activity_notification_updated"));
  }
}

export const activityNotificationService = {
  getNotifications(userRole = "ADMIN") {
    const list = getStoredNotifications();
    const norm = String(userRole || "EMPLOYEE").toUpperCase();

    return list.filter((n) => {
      if (n.targetAudience === "ALL") return true;
      if (norm === "ADMIN") return true;
      if (norm === "HR") return n.targetAudience !== "ADMIN_ONLY";
      return n.targetAudience === "ALL" || n.targetAudience === "EMPLOYEE";
    });
  },

  addNotification({
    title,
    message,
    actor = {},
    actorRole = "HR",
    targetAudience = "ALL",
    type = "system",
    priority = "normal",
    link = "/dashboard",
  }) {
    const list = getStoredNotifications();
    const newNotif = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      actor: {
        name:
          actor.name ||
          (actorRole === "ADMIN"
            ? "Sarah Connor"
            : actorRole === "HR"
            ? "Aaliyah Patel"
            : "Elena Rostova"),
        role: actorRole,
        email: actor.email || `${actorRole.toLowerCase()}@hcmlite.internal`,
      },
      actorRole,
      targetAudience,
      type,
      priority,
      isRead: false,
      timestamp: new Date().toISOString(),
      link,
    };

    const updated = [newNotif, ...list];
    saveNotifications(updated);
    return newNotif;
  },

  markAsRead(id) {
    const updated = getStoredNotifications().map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    saveNotifications(updated);
  },

  markAllAsRead() {
    const updated = getStoredNotifications().map((n) => ({ ...n, isRead: true }));
    saveNotifications(updated);
  },

  simulateAction(actionKey) {
    switch (actionKey) {
      case "ADMIN_POLICY_UPDATE":
        return this.addNotification({
          title: "10-Tab Policy Configuration Saved",
          message: "Super Admin updated Late & Overtime computation rules.",
          actorRole: "ADMIN",
          targetAudience: "ALL",
          type: "policy",
          priority: "normal",
          link: "/settings",
        });
      case "HR_DEVICE_SYNC":
        return this.addNotification({
          title: "Biometric Logs Synchronized",
          message: "HR pulled punch batches across registered terminals.",
          actorRole: "HR",
          targetAudience: "ADMIN_HR",
          type: "attendance",
          priority: "normal",
          link: "/hr",
        });
      case "HR_PAYROLL_DRAFT":
        return this.addNotification({
          title: "Payroll Draft Prepared",
          message: "HR submitted monthly payroll draft for Administrator final lock.",
          actorRole: "HR",
          targetAudience: "ADMIN_HR",
          type: "payroll",
          priority: "high",
          link: "/payroll",
        });
      default:
        return this.addNotification({
          title: "HCM Workforce Telemetry Synced",
          message: "Attendance, leave balances, and shift rosters are up to date.",
          actorRole: "ADMIN",
          targetAudience: "ALL",
          type: "system",
          priority: "normal",
          link: "/dashboard",
        });
    }
  },
};
