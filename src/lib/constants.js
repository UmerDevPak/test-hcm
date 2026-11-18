export const ROLES = {
  ADMIN: "ADMIN",
  SUPER_ADMIN: "ADMIN",
  HR: "HR",
  HR_MANAGER: "HR",
  DEPARTMENT_MANAGER: "HR",
  MANAGER: "HR",
  EMPLOYEE: "EMPLOYEE",
  Admin: "ADMIN",
  Employee: "EMPLOYEE",
};

export function normalizeRole(role) {
  if (!role) return "EMPLOYEE";
  const upper = String(role).trim().toUpperCase();
  if (upper === "ADMIN" || upper === "SUPER_ADMIN") {
    return "ADMIN";
  }
  if (
    upper === "HR" ||
    upper === "HR_MANAGER" ||
    upper === "HR_ADMIN" ||
    upper === "MANAGER" ||
    upper === "DEPARTMENT_MANAGER"
  ) {
    return "HR";
  }
  return "EMPLOYEE";
}

export const ROLE_LABELS = {
  ADMIN: "Admin",
  SUPER_ADMIN: "Admin",
  HR: "HR",
  HR_MANAGER: "HR",
  EMPLOYEE: "Employee",
  Admin: "Admin",
  Employee: "Employee",
};

export const ROLE_DESCRIPTIONS = {
  ADMIN: "Super Administrator · 10-Tab HCM Setup, Audit Governance & Payroll Lock",
  HR: "Human Resources · Biometric Operations, Approvals & Payroll Drafts",
  EMPLOYEE: "Employee · Self-Service Attendance, Leave & Finalized Payslips",
};

export const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Product",
  "Design",
  "Operations",
  "Finance",
  "Sales & Marketing",
];

export const EMPLOYEE_STATUS = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  PROBATION: "Probation",
  TERMINATED: "Terminated",
  PENDING: "Pending Activation",
};

export const EMPLOYEE_RANKS = {
  RANK_A: "Rank A",
  RANK_B: "Rank B",
  RANK_C: "Rank C",
};

export const RANK_CONFIG = {
  "Rank A": {
    label: "Rank A · Top Performer",
    badgeLabel: "Rank A",
    tier: "Tier 1: High Performer / Exemplary",
    description: "Consistently exceeds KPIs and project sprints, exhibits proactive leadership, zero disciplinary issues, and exemplary attendance.",
    color: "purple",
    badgeClasses: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    glowClasses: "shadow-purple-500/20 ring-1 ring-purple-500/30",
    minScore: 90,
  },
  "Rank B": {
    label: "Rank B · Core Performer",
    badgeLabel: "Rank B",
    tier: "Tier 2: Core Performer / Proficient",
    description: "Reliable team player, consistently meets sprint targets and milestones, dependable collaboration, standard punctuality.",
    color: "emerald",
    badgeClasses: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    glowClasses: "shadow-emerald-500/20 ring-1 ring-emerald-500/30",
    minScore: 75,
  },
  "Rank C": {
    label: "Rank C · Developing",
    badgeLabel: "Rank C",
    tier: "Tier 3: Developing / Action Needed",
    description: "Requires structured mentoring or probation follow-up. Demonstrates technical potential but has gaps in task completion or attendance discipline.",
    color: "amber",
    badgeClasses: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    glowClasses: "shadow-amber-500/20 ring-1 ring-amber-500/30",
    minScore: 0,
  },
};

export const EMPLOYMENT_TYPE = {
  FULL_TIME: "Full-Time",
  PART_TIME: "Part-Time",
  CONTRACT: "Contract",
  INTERN: "Intern",
  PROBATION: "Probation",
};

export const LEAVE_TYPES = {
  ANNUAL: "Annual",
  CASUAL: "Casual",
  SICK: "Sick",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  MARRIAGE: "Marriage",
  BEREAVEMENT: "Bereavement",
  HAJJ_UMRAH: "HajjUmrah",
  STUDY: "Study",
  COMP_OFF: "CompOff",
  SHORT_LEAVE: "ShortLeave",
  UNPAID: "Unpaid",
};

export const LEAVE_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const LEAVE_QUOTAS = {
  Annual: 14,
  Casual: 10,
  Sick: 8,
  Maternity: 90,
  Paternity: 10,
  Marriage: 5,
  Bereavement: 5,
  HajjUmrah: 15,
  Study: 5,
  CompOff: 0,
  ShortLeave: 24,
  Unpaid: 30,
};

export const EXPENSE_CATEGORIES = [
  "Travel",
  "Software & SaaS",
  "Hardware",
  "Meals & Client",
  "Training",
  "Office Supplies",
];

export const EXPENSE_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REIMBURSED: "Reimbursed",
};

export const TAX_SLABS = [
  { min: 0, max: 60000, baseTax: 0, rate: 0.08 },
  { min: 60000, max: 120000, baseTax: 4800, rate: 0.14 },
  { min: 120000, max: 200000, baseTax: 13200, rate: 0.2 },
  { min: 200000, max: null, baseTax: 29200, rate: 0.25 },
];

export const DOCUMENT_CATEGORIES = [
  "Company Handbook",
  "Employment Contract",
  "Benefits & Health",
  "Performance & Reviews",
  "Tax & Compliance",
  "Certifications",
];
