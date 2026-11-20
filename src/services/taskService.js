import { db, auth, isLiveFirebaseConfigured } from "@/lib/firebase/client";

const STORAGE_KEY = "hcm_lite_tasks_ledger";

export const TASK_STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
};

export const TASK_PRIORITY = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const INITIAL_TASKS = [
  {
    id: "TSK-101",
    title: "Implement OAuth2 / SAML Single Sign-On Integration",
    description: "Connect enterprise Okta/Azure AD identity provider for corporate single sign-on compliance.",
    department: "Engineering",
    priority: "High",
    status: TASK_STATUS.SUBMITTED,
    assignedTo: {
      id: "EMP-003",
      name: "Elena Rostova",
      email: "employee@hcmlite.internal",
      jobTitle: "Staff Software Engineer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
    dueDate: "2026-10-30",
    createdAt: "2026-10-22T09:00:00Z",
    submittedAt: "2026-10-26T16:45:00Z",
    deliverable: {
      notes: "Completed SAML v2.0 handshake validation with encrypted assertions and unit tests.",
      link: "https://github.com/enterprise/hcm-lite/pull/142",
      fileName: "sso-security-audit-report.pdf",
    },
    hrReview: null,
  },
  {
    id: "TSK-102",
    title: "Quarterly Statutory Tax Slab & Payroll Deduction Audit",
    description: "Verify federal FICA, state disability, and local payroll deduction brackets for Q4 disbursement.",
    department: "Finance",
    priority: "Urgent",
    status: TASK_STATUS.APPROVED,
    assignedTo: {
      id: "EMP-004",
      name: "David Chen",
      email: "finance@hcmlite.internal",
      jobTitle: "Head of Finance",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
    dueDate: "2026-10-25",
    createdAt: "2026-10-18T10:00:00Z",
    submittedAt: "2026-10-24T14:20:00Z",
    deliverable: {
      notes: "Audited all 8 employee gross-to-net tax calculations against IRS publication 15-T.",
      link: "https://docs.google.com/spreadsheets/d/hcm-tax-ledger-q4",
      fileName: "q4-tax-compliance-signoff.xlsx",
    },
    hrReview: {
      reviewedBy: "Aaliyah Patel",
      reviewedAt: "2026-10-25T11:00:00Z",
      decision: "APPROVED",
      feedback: "Verified and cross-checked against Treasury guidelines. Excellent precision.",
      score: 5,
    },
  },
  {
    id: "TSK-103",
    title: "New Employee Onboarding Handbook 2026 Revisions",
    description: "Update medical benefits, PTO accrual policies (14 Annual, 8 Sick, 10 Casual), and whistleblowing redressal guidelines.",
    department: "Human Resources",
    priority: "Medium",
    status: TASK_STATUS.IN_PROGRESS,
    assignedTo: {
      id: "EMP-002",
      name: "Aaliyah Patel",
      email: "hr@hcmlite.internal",
      jobTitle: "VP of People Operations",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
    dueDate: "2026-11-05",
    createdAt: "2026-10-20T11:00:00Z",
    submittedAt: null,
    deliverable: null,
    hrReview: null,
  },
  {
    id: "TSK-104",
    title: "Design System Dark Theme Accessibility Contrast (WCAG AAA)",
    description: "Audit all dashboard metric cards, badge indicators, and data tables to ensure 7:1 contrast compliance.",
    department: "Product",
    priority: "Medium",
    status: TASK_STATUS.REVISION_REQUESTED,
    assignedTo: {
      id: "EMP-005",
      name: "Priya Sharma",
      email: "priya@hcmlite.internal",
      jobTitle: "Lead Product Designer",
      avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80",
    },
    dueDate: "2026-10-28",
    createdAt: "2026-10-15T08:30:00Z",
    submittedAt: "2026-10-22T17:00:00Z",
    deliverable: {
      notes: "Updated Figma token library for typography and zinc background scales.",
      link: "https://figma.com/file/enterprise-hcm-tokens",
      fileName: "wcag-contrast-audit.pdf",
    },
    hrReview: {
      reviewedBy: "Aaliyah Patel",
      reviewedAt: "2026-10-23T10:15:00Z",
      decision: "REVISION_REQUESTED",
      feedback: "The low-priority badge color in the complaints ledger still measures 4.2:1. Please increase luminance to meet AAA.",
      score: 3,
    },
  },
  {
    id: "TSK-105",
    title: "SOC-2 Type II Annual Evidence Collection & Key Vault Rotation",
    description: "Executive strategic objective: Collect audit logs, access authorization records, and rotate encryption keys.",
    department: "Executive",
    priority: "Urgent",
    status: TASK_STATUS.TODO,
    assignedTo: {
      id: "EMP-001",
      name: "Sarah Connor",
      email: "admin@hcmlite.internal",
      jobTitle: "Chief Executive Officer / Super Admin",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    },
    dueDate: "2026-11-15",
    createdAt: "2026-10-25T14:00:00Z",
    submittedAt: null,
    deliverable: null,
    hrReview: null,
    isExecutiveOkr: true,
  },
];

function getStoredTasks() {
  if (typeof window === "undefined") return INITIAL_TASKS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
    return INITIAL_TASKS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_TASKS;
  }
}

function saveStoredTasks(tasks) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }
}

function syncTaskToFirestore(taskId, taskData) {
  if (isLiveFirebaseConfigured && db && auth?.currentUser) {
    import("firebase/firestore")
      .then(({ doc, setDoc }) => {
        setDoc(doc(db, "tasks", taskId), taskData, { merge: true }).catch((err) => {
          console.warn("[taskService] Firestore write notice:", err.message);
        });
      })
      .catch(() => {});
  }
}

function deleteTaskFromFirestore(taskId) {
  if (isLiveFirebaseConfigured && db && auth?.currentUser) {
    import("firebase/firestore")
      .then(({ doc, deleteDoc }) => {
        deleteDoc(doc(db, "tasks", taskId)).catch((err) => {
          console.warn("[taskService] Firestore delete notice:", err.message);
        });
      })
      .catch(() => {});
  }
}

export const taskService = {
  /**
   * Synchronously peek tasks from local cache for instant 0ms mount
   */
  peekCachedTasks({ role = "EMPLOYEE", userEmail = "", employeeId = "" } = {}) {
    if (typeof window === "undefined") return INITIAL_TASKS;
    const tasks = getStoredTasks();
    const normRole = (role || "").toUpperCase();
    if (normRole === "ADMIN" || normRole === "HR") return tasks;
    return tasks.filter(
      (t) =>
        (employeeId && t.assignedTo?.id === employeeId) ||
        (userEmail && t.assignedTo?.email?.toLowerCase() === userEmail.toLowerCase())
    );
  },

  /**
   * Synchronously peek telemetry stats from local cache for instant 0ms mount
   */
  peekCachedStats() {
    if (typeof window === "undefined") return null;
    const tasks = getStoredTasks();
    const total = tasks.length;
    const submittedForReview = tasks.filter((t) => t.status === TASK_STATUS.SUBMITTED).length;
    const approved = tasks.filter((t) => t.status === TASK_STATUS.APPROVED).length;
    const inProgress = tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length;
    const revision = tasks.filter((t) => t.status === TASK_STATUS.REVISION_REQUESTED).length;
    const todo = tasks.filter((t) => t.status === TASK_STATUS.TODO).length;
    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const departments = ["Engineering", "Finance", "Human Resources", "Product", "Executive"];
    const deptStats = departments.map((dept) => {
      const deptTasks = tasks.filter((t) => t.department === dept);
      const done = deptTasks.filter((t) => t.status === TASK_STATUS.APPROVED).length;
      const rate = deptTasks.length > 0 ? Math.round((done / deptTasks.length) * 100) : 0;
      return { name: dept, total: deptTasks.length, done, rate };
    });

    return {
      total,
      submittedForReview,
      approved,
      inProgress,
      revision,
      todo,
      completionRate,
      deptStats,
    };
  },

  /**
   * Get all tasks filtered by role and user (instant local with background Firestore sync)
   */
  async getTasks({ role = "EMPLOYEE", userEmail = "", employeeId = "" } = {}) {
    const normRole = (role || "").toUpperCase();
    let tasks = getStoredTasks();

    // Trigger non-blocking background fetch from Firestore without holding up the UI
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      import("firebase/firestore")
        .then(async ({ collection, getDocs }) => {
          try {
            const snap = await Promise.race([
              getDocs(collection(db, "tasks")),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
            ]);
            if (!snap.empty) {
              const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              const current = getStoredTasks();
              let changed = false;
              remote.forEach((rem) => {
                const idx = current.findIndex((t) => t.id === rem.id);
                if (idx !== -1) {
                  if (JSON.stringify(current[idx]) !== JSON.stringify(rem)) {
                    current[idx] = rem;
                    changed = true;
                  }
                } else {
                  current.unshift(rem);
                  changed = true;
                }
              });
              if (changed) {
                saveStoredTasks(current);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("hcm_tasks_updated"));
                }
              }
            }
          } catch (err) {
            console.warn("[taskService] Firestore fetch notice:", err.message);
          }
        })
        .catch(() => {});
    }

    if (normRole === "ADMIN" || normRole === "HR") {
      return tasks;
    }

    // Regular Employee: sees tasks assigned to them
    return tasks.filter(
      (t) =>
        (employeeId && t.assignedTo?.id === employeeId) ||
        (userEmail && t.assignedTo?.email?.toLowerCase() === userEmail.toLowerCase())
    );
  },

  /**
   * Employee submits deliverable for a task (Instant 0ms response)
   */
  async submitDeliverable(taskId, { notes, link, fileName, submittedBy }) {
    const tasks = getStoredTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error("Task not found");

    const updated = {
      ...tasks[idx],
      status: TASK_STATUS.SUBMITTED,
      submittedAt: new Date().toISOString(),
      deliverable: {
        notes: notes || "Work delivered and ready for HR evaluation.",
        link: link || "",
        fileName: fileName || "deliverable-package.zip",
        submittedBy: submittedBy || tasks[idx].assignedTo?.name,
      },
    };

    tasks[idx] = updated;
    saveStoredTasks(tasks);
    syncTaskToFirestore(taskId, updated);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_tasks_updated"));
    }
    return updated;
  },

  /**
   * HR reviews and approves or requests revision on a submitted task (Instant 0ms response)
   */
  async reviewTask(taskId, { decision, feedback, score = 5, reviewerName }) {
    const tasks = getStoredTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error("Task not found");

    const newStatus =
      decision === "APPROVED" ? TASK_STATUS.APPROVED : TASK_STATUS.REVISION_REQUESTED;

    const updated = {
      ...tasks[idx],
      status: newStatus,
      hrReview: {
        reviewedBy: reviewerName || "Aaliyah Patel (HR)",
        reviewedAt: new Date().toISOString(),
        decision,
        feedback: feedback || (decision === "APPROVED" ? "Deliverable approved." : "Revisions required."),
        score: Number(score) || 5,
      },
    };

    tasks[idx] = updated;
    saveStoredTasks(tasks);
    syncTaskToFirestore(taskId, updated);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_tasks_updated"));
    }
    return updated;
  },

  /**
   * Create a new task (by HR or Admin) - Instant 0ms response
   */
  async createTask(data) {
    const tasks = getStoredTasks();
    const newId = `TSK-${Math.floor(100 + Math.random() * 900)}`;

    const newTask = {
      id: newId,
      title: data.title,
      description: data.description || "",
      department: data.department || "Engineering",
      priority: data.priority || "Medium",
      status: TASK_STATUS.TODO,
      assignedTo: data.assignedTo || {
        id: "EMP-003",
        name: "Elena Rostova",
        email: "employee@hcmlite.internal",
        jobTitle: "Staff Software Engineer",
      },
      dueDate: data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      submittedAt: null,
      deliverable: null,
      hrReview: null,
      isExecutiveOkr: Boolean(data.isExecutiveOkr),
    };

    tasks.unshift(newTask);
    saveStoredTasks(tasks);
    syncTaskToFirestore(newId, newTask);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_tasks_updated"));
    }
    return newTask;
  },

  /**
   * Quick status toggle (e.g., employee moves TODO -> IN_PROGRESS)
   */
  async updateStatus(taskId, newStatus) {
    const tasks = getStoredTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error("Task not found");

    tasks[idx].status = newStatus;
    saveStoredTasks(tasks);
    syncTaskToFirestore(taskId, tasks[idx]);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_tasks_updated"));
    }
    return tasks[idx];
  },

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    const tasks = getStoredTasks();
    const filtered = tasks.filter((t) => t.id !== taskId);
    saveStoredTasks(filtered);
    deleteTaskFromFirestore(taskId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hcm_tasks_updated"));
    }
    return true;
  },

  /**
   * Get telemetry stats for dashboard cards & velocity bars
   */
  async getTaskStats() {
    const tasks = getStoredTasks();
    const total = tasks.length;
    const submittedForReview = tasks.filter((t) => t.status === TASK_STATUS.SUBMITTED).length;
    const approved = tasks.filter((t) => t.status === TASK_STATUS.APPROVED).length;
    const inProgress = tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length;
    const revision = tasks.filter((t) => t.status === TASK_STATUS.REVISION_REQUESTED).length;
    const todo = tasks.filter((t) => t.status === TASK_STATUS.TODO).length;

    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    // Department completion metrics
    const departments = ["Engineering", "Finance", "Human Resources", "Product", "Executive"];
    const deptStats = departments.map((dept) => {
      const deptTasks = tasks.filter((t) => t.department === dept);
      const done = deptTasks.filter((t) => t.status === TASK_STATUS.APPROVED).length;
      const rate = deptTasks.length > 0 ? Math.round((done / deptTasks.length) * 100) : 0;
      return {
        name: dept,
        total: deptTasks.length,
        done,
        rate,
      };
    });

    return {
      total,
      submittedForReview,
      approved,
      inProgress,
      revision,
      todo,
      completionRate,
      deptStats,
    };
  },
};
