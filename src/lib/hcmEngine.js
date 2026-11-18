import { TAX_SLABS } from "./constants.js";

/**
 * Complete 10-Tab HCM Setup Default Configuration matching
 * "HCM Setup Page - Configuration Specification" (24-page PDF)
 */
export const DEFAULT_HCM_CONFIG = {
  version: 1,
  effectiveFrom: "2026-01-01",
  updatedAt: "2026-10-01T09:00:00.000Z",
  updatedBy: "Sarah Connor",

  // Tab 01: Device Setup
  devices: [
    {
      id: "DEV-01",
      name: "Main Gate - HQ SpeedFace",
      serialNumber: "ZK-SF-2026-001",
      brandModel: "ZKTeco SpeedFace-V5L",
      type: "Face + Fingerprint",
      connectionMode: "LAN IP / ADMS Push",
      ipAddress: "192.168.10.201",
      branch: "San Francisco (HQ)",
      direction: "BOTH",
      timeZone: "America/Los_Angeles",
      status: "Online",
      enabled: true,
      lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      usersCount: 8,
      logsCount: 142,
      firmware: "v8.4.2-BioPush",
      storageUsedPct: 18,
      lastError: null,
      autoPullMinutes: 15,
      offlineAlert: true,
      timeDriftAlert: true,
    },
    {
      id: "DEV-02",
      name: "Floor 2 - Engineering Lab",
      serialNumber: "HK-K1T-2026-014",
      brandModel: "Hikvision DS-K1T671",
      type: "Face + RFID Card",
      connectionMode: "Cloud Push SDK",
      ipAddress: "192.168.10.204",
      branch: "San Francisco (HQ)",
      direction: "IN",
      timeZone: "America/Los_Angeles",
      status: "Online",
      enabled: true,
      lastSeen: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      lastSync: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      usersCount: 5,
      logsCount: 89,
      firmware: "v3.2.1",
      storageUsedPct: 12,
      lastError: null,
      autoPullMinutes: 15,
      offlineAlert: true,
      timeDriftAlert: true,
    },
    {
      id: "DEV-03",
      name: "New York Hub - Lobby Terminal",
      serialNumber: "ZK-MB-2026-088",
      brandModel: "ZKTeco MB460",
      type: "Biometric + PIN",
      connectionMode: "ADMS Cloud Push",
      ipAddress: "10.20.4.18",
      branch: "New York, NY",
      direction: "BOTH",
      timeZone: "America/New_York",
      status: "Offline",
      enabled: true,
      lastSeen: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      lastSync: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      usersCount: 4,
      logsCount: 31,
      firmware: "v7.9.0",
      storageUsedPct: 44,
      lastError: "ADMS heartbeat timeout (> 60 mins) — check branch gateway",
      autoPullMinutes: 30,
      offlineAlert: true,
      timeDriftAlert: true,
    },
  ],

  // Tab 02: Device Pulled User Staging Pool
  deviceUsers: [
    { deviceId: "DEV-01", deviceUserId: "101", name: "Sarah Connor", privilege: "Admin", hasFace: true, hasFinger: true, cardNo: "RFID-9001", enabled: true },
    { deviceId: "DEV-01", deviceUserId: "102", name: "Marcus Vance", privilege: "User", hasFace: true, hasFinger: true, cardNo: "RFID-9002", enabled: true },
    { deviceId: "DEV-01", deviceUserId: "103", name: "Elena Rostova", privilege: "User", hasFace: true, hasFinger: true, cardNo: "RFID-9003", enabled: true },
    { deviceId: "DEV-01", deviceUserId: "104", name: "David Chen", privilege: "User", hasFace: true, hasFinger: false, cardNo: "RFID-9004", enabled: true },
    { deviceId: "DEV-01", deviceUserId: "105", name: "Aaliyah Patel", privilege: "Manager", hasFace: true, hasFinger: true, cardNo: "RFID-9005", enabled: true },
    { deviceId: "DEV-02", deviceUserId: "106", name: "Lucas Silva", privilege: "User", hasFace: true, hasFinger: true, cardNo: "RFID-9006", enabled: true },
    { deviceId: "DEV-02", deviceUserId: "108", name: "J. Taylor", privilege: "User", hasFace: true, hasFinger: false, cardNo: "RFID-9008", enabled: true },
    { deviceId: "DEV-01", deviceUserId: "109", name: "Omar Farooq", privilege: "User", hasFace: true, hasFinger: true, cardNo: "RFID-9019", enabled: true },
    { deviceId: "DEV-03", deviceUserId: "110", name: "Hannah Abbott", privilege: "User", hasFace: true, hasFinger: false, cardNo: "RFID-9020", enabled: true },
  ],

  // Tab 03: Attendance Rule
  attendanceRule: {
    workingDaysPerWeek: 5, // 4, 5, 5.5, 6, 7
    weeklyOffDays: [0, 6], // 0 = Sun, 6 = Sat
    alternateSaturdays: "none", // none | 1st_3rd_off | 2nd_4th_off
    monthlyDaysMethod: "WorkingDays", // CalendarDays | FixedDays | WorkingDays
    fixedWorkingDaysCount: 22,
    dayCutoffTime: "04:00", // Night shift boundary
    minHoursFullDay: 8,
    minHoursHalfDay: 5,
    attendanceSource: "FirstInLastOut", // FirstInLastOut | AllPairs
    punchWindowStart: "06:00",
    punchWindowEnd: "23:30",
    duplicatePunchGapMinutes: 5,
    missingPunchRule: "MarkMissingPunch", // MarkMissingPunch | AutoHalfDay | AutoAbsent | ShiftEndFallback
    breakPaid: false,
    breakMinutes: 60,
    workOnOffHolidayTreatment: "Overtime", // Overtime | CompOff | Both
    allowEmployeeCorrection: true,
    correctionWindowDays: 7,
    correctionApprovalFlow: "Employee -> HR / Manager -> Payroll Lock",
    attendanceLockedUpTo: "", // YYYY-MM-DD when locked by payroll
    payrollCycleStartDay: 1, // 1 (1st-end) or 26 (26th-25th)
    roundingMinutes: 0, // 0, 5, 10, 15
    statusesPriority: ["Holiday", "ApprovedLeave", "WeeklyOff", "OnDuty", "WFH", "HalfDay", "Late", "Present", "MissingPunch", "Absent"],
  },

  // Tab 04: Late Policy
  latePolicy: {
    enabled: true,
    graceMinutes: 15,
    graceFrequencyPerMonth: 3, // Max times grace can be used before strict count
    deductFrom: "AfterGrace", // AfterGrace | ShiftStart
    deductionMethod: "FrequencyPenalty", // ActualMinutes | RoundedSlab | FullHour | SlabTable | FixedAmount | FrequencyPenalty
    deductionTarget: "Salary", // Salary | LeaveBalance
    fixedPenaltyAmount: 25,
    frequencyPenaltyEnabled: true,
    frequencyPenaltyThreshold: 3, // Every 3 lates = 0.5 day
    frequencyPenaltyDays: 0.5,
    progressivePenalty: true, // escalates after threshold
    exemptDepartments: [],
    breakReturnLateTrack: true,
    habitualLateAlertThreshold: 3,
    slabTable: [
      { minMinutes: 1, maxMinutes: 15, penaltyMinutes: 0, label: "Grace Window" },
      { minMinutes: 16, maxMinutes: 30, penaltyMinutes: 30, label: "Slab 1 (30m)" },
      { minMinutes: 31, maxMinutes: 60, penaltyMinutes: 60, label: "Slab 2 (1 hr)" },
      { minMinutes: 61, maxMinutes: 120, penaltyMinutes: 120, label: "Slab 3 (2 hrs)" },
    ],
  },

  // Tab 05: Overtime Policy
  overtimePolicy: {
    enabled: true,
    approvalRequired: true,
    afterShiftBufferMinutes: 30,
    beforeShiftBufferMinutes: 30,
    minOtMinutes: 30,
    maxDailyOtHours: 4,
    maxMonthlyOtHours: 45,
    workingDayMultiplier: 1.5,
    weeklyOffMultiplier: 2.0,
    publicHolidayMultiplier: 2.0,
    nightOtMultiplier: 1.75,
    rateBase: "Basic", // Basic | Gross
    roundingMinutes: 15,
    compensationType: "Cash", // Cash | CompOff | TimeInLieu
    netLateAgainstOt: false,
    eligibleTypes: ["Full-Time", "Part-Time"],
  },

  // Tab 06: Shifts
  shifts: [
    {
      id: "SHF-GEN",
      code: "GEN",
      name: "General Office Shift",
      type: "Fixed",
      startTime: "09:00",
      endTime: "18:00",
      breakMinutes: 60,
      graceMinutesOverride: null,
      punchWindowMinutes: 120,
      crossesMidnight: false,
      shiftAllowance: 0,
      color: "#6366f1",
      assignedDepartments: ["Executive", "Human Resources", "Product", "Finance & Operations", "Sales", "Marketing"],
      seasonalOverrides: [
        {
          id: "SEA-RAMADAN",
          name: "Seasonal / Ramadan Reduced Hours",
          startDate: "2026-02-18",
          endDate: "2026-03-19",
          startTime: "09:00",
          endTime: "15:30",
          graceMinutes: 20,
        },
      ],
    },
    {
      id: "SHF-FLEX",
      code: "FLEX",
      name: "Engineering Core Flex",
      type: "Flexible",
      startTime: "10:00",
      endTime: "19:00",
      breakMinutes: 60,
      graceMinutesOverride: 30,
      punchWindowMinutes: 150,
      crossesMidnight: false,
      shiftAllowance: 0,
      color: "#06b6d4",
      assignedDepartments: ["Engineering", "Design"],
      seasonalOverrides: [],
    },
    {
      id: "SHF-EVE",
      code: "EVE",
      name: "Evening Support Shift",
      type: "Rotational",
      startTime: "14:00",
      endTime: "23:00",
      breakMinutes: 45,
      graceMinutesOverride: 15,
      punchWindowMinutes: 120,
      crossesMidnight: false,
      shiftAllowance: 150,
      color: "#f59e0b",
      assignedDepartments: ["Customer Success"],
      seasonalOverrides: [],
    },
    {
      id: "SHF-NGT",
      code: "NGT",
      name: "Night Operations (SRE)",
      type: "Night",
      startTime: "22:00",
      endTime: "07:00",
      breakMinutes: 60,
      graceMinutesOverride: 15,
      punchWindowMinutes: 120,
      crossesMidnight: true,
      shiftAllowance: 300,
      color: "#a855f7",
      assignedDepartments: [],
      seasonalOverrides: [],
    },
  ],

  // Tab 07: OFF / Half Day Rules
  offHalfDayRule: {
    lateHalfDayAfterMinutes: 90,
    lateAbsentAfterMinutes: 240,
    earlyHalfDayBeforeMinutes: 90,
    earlyAbsentBeforeMinutes: 240,
    hoursBasedHalfDayMin: 5,
    hoursBasedAbsentMin: 2,
    singlePunchAction: "HalfDay", // HalfDay | MissingPunch | Absent
    halfDayAutoLeaveAdjust: false,
    paidWeeklyOffRequiredPresentDays: 2,
    sandwichRuleEnabled: true,
    conflictPriority: ["Holiday", "ApprovedLeave", "WeeklyOff", "HalfDay", "Late", "Present"],
  },

  // Tab 08: Public Holidays
  holidays: [
    {
      id: "HOL-01",
      name: "New Year's Day",
      date: "2026-01-01",
      endDate: "2026-01-01",
      type: "National",
      recurrence: "Fixed",
      paid: true,
      applyToBranch: "All Branches",
      applyToDepartment: "All",
      applyToReligion: "All",
      overrideWeeklyOff: "None",
      sandwichLinked: true,
    },
    {
      id: "HOL-02",
      name: "Independence Day",
      date: "2026-07-04",
      endDate: "2026-07-04",
      type: "National",
      recurrence: "Fixed",
      paid: true,
      applyToBranch: "All Branches",
      applyToDepartment: "All",
      applyToReligion: "All",
      overrideWeeklyOff: "CompensatoryOff",
      sandwichLinked: true,
    },
    {
      id: "HOL-03",
      name: "Diwali Festival Closure",
      date: "2026-11-08",
      endDate: "2026-11-08",
      type: "Religious",
      recurrence: "Variable",
      paid: true,
      applyToBranch: "All Branches",
      applyToDepartment: "All",
      applyToReligion: "All",
      overrideWeeklyOff: "None",
      sandwichLinked: false,
    },
    {
      id: "HOL-04",
      name: "Thanksgiving Holiday",
      date: "2026-11-26",
      endDate: "2026-11-27",
      type: "National",
      recurrence: "Fixed",
      paid: true,
      applyToBranch: "All Branches",
      applyToDepartment: "All",
      applyToReligion: "All",
      overrideWeeklyOff: "None",
      sandwichLinked: true,
    },
    {
      id: "HOL-05",
      name: "Winter Year-End Shutdown",
      date: "2026-12-25",
      endDate: "2026-12-26",
      type: "Company Shutdown",
      recurrence: "Fixed",
      paid: true,
      applyToBranch: "All Branches",
      applyToDepartment: "All",
      applyToReligion: "All",
      overrideWeeklyOff: "None",
      sandwichLinked: false,
    },
  ],

  // Tab 09: Annual Leave Policy
  leavePolicy: {
    leaveYearStart: "Jan 1 - Dec 31",
    accrualMethod: "Upfront", // Upfront | Monthly | AfterProbation
    proRataNewJoiners: true,
    carryForwardMaxDays: 5,
    encashmentAllowed: true,
    negativeBalanceAllowed: false,
    minNoticeDays: 1,
    medicalCertAfterDays: 2,
    backDatedLimitDays: 7,
    blackoutDates: ["2026-12-30", "2026-12-31"],
    sandwichRuleApplied: false,
    deductionOrder: ["Casual", "Annual", "Unpaid"],
    leaveTypes: [
      { code: "Annual", name: "Annual Leave", quota: 14, paid: true, carryForward: true, probationAllowed: false },
      { code: "Casual", name: "Casual Leave", quota: 10, paid: true, carryForward: false, probationAllowed: true },
      { code: "Sick", name: "Sick / Medical Leave", quota: 8, paid: true, carryForward: false, probationAllowed: true },
      { code: "Maternity", name: "Maternity Leave", quota: 90, paid: true, carryForward: false, probationAllowed: false },
      { code: "Paternity", name: "Paternity Leave", quota: 7, paid: true, carryForward: false, probationAllowed: true },
      { code: "Marriage", name: "Marriage Leave", quota: 5, paid: true, carryForward: false, probationAllowed: false },
      { code: "Bereavement", name: "Bereavement Leave", quota: 5, paid: true, carryForward: false, probationAllowed: true },
      { code: "HajjUmrah", name: "Hajj / Umrah Leave", quota: 15, paid: true, carryForward: false, probationAllowed: false },
      { code: "Study", name: "Study / Exam Leave", quota: 5, paid: false, carryForward: false, probationAllowed: false },
      { code: "CompOff", name: "Compensatory Off", quota: 0, paid: true, carryForward: true, probationAllowed: true },
      { code: "ShortLeave", name: "Short Leave (Hours)", quota: 4, paid: true, carryForward: false, probationAllowed: true },
      { code: "Unpaid", name: "Leave Without Pay (LWP)", quota: 365, paid: false, carryForward: false, probationAllowed: true },
    ],
  },

  // Tab 10 (Extra): Salary Setup
  salarySetup: {
    calculationMethod: "WorkingDays", // WorkingDays | CalendarDays | Fixed30 | Fixed26 | Yearly365 | DailyWages | Hourly
    fixedDaysCount: 22,
    grossFormulaLabel: "Gross = Basic × 1.5 (40% HRA, 10% Medical)",
    basicPercentOfGross: 66.67,
    hraPercentOfBasic: 40,
    medicalPercentOfBasic: 10,
    utilitiesPercentOfBasic: 0,
    transportAllowanceFixed: 0,
    deductionBase: "Gross", // Gross | Basic
    pfPercent: 0,
    eobiFixed: 0,
    paidWeeklyOffs: true,
    paidHolidays: true,
    proRataJoinerLeaver: true,
    roundingMode: "Nearest", // Nearest | Floor | Ceil
    paymentCycleStartDay: 1,
    allowSalaryHold: true,
    taxSlabs: TAX_SLABS,
  },
};

/**
 * Parse "09:15 AM", "18:30", "9:05" into minutes since midnight (0..1439)
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Format 24h or minutes to 12-hour string like "09:15 AM"
 */
export function formatMinutesTo12h(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return "—";
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(norm / 60);
  const mins = norm % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
}

/**
 * Resolve which Shift applies to an employee on a given date (Tab 06 + Seasonal override)
 */
export function resolveEmployeeShift(config = DEFAULT_HCM_CONFIG, employee = {}, dateStr = "") {
  const shifts = Array.isArray(config?.shifts) && config.shifts.length > 0
    ? config.shifts
    : DEFAULT_HCM_CONFIG.shifts;

  let baseShift = null;
  if (employee?.assignedShiftId) {
    baseShift = shifts.find((s) => s.id === employee.assignedShiftId) || null;
  }
  if (!baseShift && employee?.department) {
    baseShift =
      shifts.find(
        (s) =>
          Array.isArray(s.assignedDepartments) &&
          s.assignedDepartments.includes(employee.department)
      ) || null;
  }
  if (!baseShift) {
    baseShift = shifts[0];
  }

  let effectiveStart = baseShift.startTime;
  let effectiveEnd = baseShift.endTime;
  let seasonalApplied = null;
  let graceOverride = baseShift.graceMinutesOverride;

  if (dateStr && Array.isArray(baseShift.seasonalOverrides)) {
    const matchSeasonal = baseShift.seasonalOverrides.find(
      (ov) => ov.startDate && ov.endDate && dateStr >= ov.startDate && dateStr <= ov.endDate
    );
    if (matchSeasonal) {
      effectiveStart = matchSeasonal.startTime || effectiveStart;
      effectiveEnd = matchSeasonal.endTime || effectiveEnd;
      if (matchSeasonal.graceMinutes !== null && matchSeasonal.graceMinutes !== undefined) {
        graceOverride = matchSeasonal.graceMinutes;
      }
      seasonalApplied = matchSeasonal.name;
    }
  }

  return {
    ...baseShift,
    effectiveStartTime: effectiveStart,
    effectiveEndTime: effectiveEnd,
    effectiveGraceMinutes:
      employee?.policyOverrides?.graceMinutes ??
      graceOverride ??
      config?.latePolicy?.graceMinutes ??
      15,
    seasonalApplied,
  };
}

/**
 * Policy Hierarchy Resolver: Employee Override > Department/Shift > Company Default
 */
export function resolveEffectivePolicies(config = DEFAULT_HCM_CONFIG, employee = {}, dateStr = "") {
  const shift = resolveEmployeeShift(config, employee, dateStr);
  const empOverrides = employee?.policyOverrides || {};
  const isExemptLate =
    Boolean(empOverrides.lateExempt) ||
    (Array.isArray(config?.latePolicy?.exemptDepartments) &&
      config.latePolicy.exemptDepartments.includes(employee?.department));

  return {
    shift,
    graceMinutes: isExemptLate ? 999 : shift.effectiveGraceMinutes,
    isExemptLate,
    weeklyOffDays: empOverrides.weeklyOffDays || config?.attendanceRule?.weeklyOffDays || [0, 6],
    overtimeEligible:
      empOverrides.overtimeEligible !== undefined
        ? Boolean(empOverrides.overtimeEligible)
        : Boolean(config?.overtimePolicy?.enabled) &&
          (!employee?.employmentType ||
            !Array.isArray(config?.overtimePolicy?.eligibleTypes) ||
            config.overtimePolicy.eligibleTypes.includes(employee.employmentType)),
  };
}

/**
 * Check if dateStr matches any configured Public Holiday for the employee
 */
export function isHolidayForEmployee(holidays = [], employee = {}, dateStr = "") {
  if (!dateStr || !Array.isArray(holidays)) return null;
  return (
    holidays.find((h) => {
      if (!h.date) return false;
      const end = h.endDate || h.date;
      if (dateStr < h.date || dateStr > end) return false;
      const branchOk =
        !h.applyToBranch ||
        h.applyToBranch === "All Branches" ||
        !employee?.branch ||
        employee.branch === h.applyToBranch;
      const deptOk =
        !h.applyToDepartment ||
        h.applyToDepartment === "All" ||
        !employee?.department ||
        employee.department === h.applyToDepartment;
      const relOk =
        !h.applyToReligion ||
        h.applyToReligion === "All" ||
        !employee?.religion ||
        employee.religion === h.applyToReligion;
      return branchOk && deptOk && relOk;
    }) || null
  );
}

/**
 * Check Weekly Off (supporting Alternate Saturdays & Custom Weekly Off Days)
 */
export function isWeeklyOffForEmployee(config = DEFAULT_HCM_CONFIG, employee = {}, dateStr = "") {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (isNaN(d.getTime())) return false;
  const dayOfWeek = d.getUTCDay();
  const weeklyOffDays =
    employee?.policyOverrides?.weeklyOffDays ||
    config?.attendanceRule?.weeklyOffDays ||
    [0, 6];

  if (weeklyOffDays.includes(dayOfWeek)) return true;

  // Alternate Saturday rule
  const altSat = config?.attendanceRule?.alternateSaturdays || "none";
  if (dayOfWeek === 6 && altSat !== "none") {
    const dayOfMonth = d.getUTCDate();
    const weekNumber = Math.ceil(dayOfMonth / 7);
    if (altSat === "1st_3rd_off" && (weekNumber === 1 || weekNumber === 3)) return true;
    if (altSat === "2nd_4th_off" && (weekNumber === 2 || weekNumber === 4)) return true;
  }
  return false;
}

/**
 * Duplicate punch filter window check (Tab 01 / Tab 03)
 */
export function isDuplicatePunchGap({ previousTimestampMs, currentTimestampMs, gapMinutes = 5 }) {
  if (!previousTimestampMs || !currentTimestampMs) return false;
  const diffMinutes = Math.abs(currentTimestampMs - previousTimestampMs) / (1000 * 60);
  return diffMinutes < Number(gapMinutes || 0);
}

/**
 * Full Attendance Punch Evaluator (Tabs 03, 04, 05, 06, 07, 08)
 */
export function evaluateDailyAttendance({
  config = DEFAULT_HCM_CONFIG,
  employee = {},
  date = "",
  clockIn = null,
  clockOut = null,
  holidays = null,
  workMode = "Office (HQ)",
}) {
  const effectiveHolidays = holidays || config?.holidays || DEFAULT_HCM_CONFIG.holidays;
  const policy = resolveEffectivePolicies(config, employee, date);
  const shift = policy.shift;
  const attRule = config?.attendanceRule || DEFAULT_HCM_CONFIG.attendanceRule;
  const lateRule = config?.latePolicy || DEFAULT_HCM_CONFIG.latePolicy;
  const otRule = config?.overtimePolicy || DEFAULT_HCM_CONFIG.overtimePolicy;
  const halfRule = config?.offHalfDayRule || DEFAULT_HCM_CONFIG.offHalfDayRule;

  const holidayMatch = isHolidayForEmployee(effectiveHolidays, employee, date);
  const weeklyOff = isWeeklyOffForEmployee(config, employee, date);

  const shiftStartMin = parseTimeToMinutes(shift.effectiveStartTime) ?? 540;
  let shiftEndMin = parseTimeToMinutes(shift.effectiveEndTime) ?? 1080;
  if (shift.crossesMidnight && shiftEndMin <= shiftStartMin) {
    shiftEndMin += 1440;
  }
  const scheduledMinutes = Math.max(60, shiftEndMin - shiftStartMin);

  const inMin = parseTimeToMinutes(clockIn);
  let outMin = parseTimeToMinutes(clockOut);
  if (inMin !== null && outMin !== null && outMin < inMin) {
    outMin += 1440; // crossed midnight
  }

  // Missing both punches
  if (inMin === null && outMin === null) {
    if (holidayMatch) {
      return { status: "Holiday", isLate: false, lateMinutes: 0, isHalfDay: false, hoursWorked: 0, overtimeHours: 0, overtimeMultiplier: 1, shiftId: shift.id, shiftName: shift.name, notes: holidayMatch.name };
    }
    if (weeklyOff) {
      return { status: "Weekly Off", isLate: false, lateMinutes: 0, isHalfDay: false, hoursWorked: 0, overtimeHours: 0, overtimeMultiplier: 1, shiftId: shift.id, shiftName: shift.name, notes: "Scheduled Off" };
    }
    return { status: "Absent", isLate: false, lateMinutes: 0, isHalfDay: false, hoursWorked: 0, overtimeHours: 0, overtimeMultiplier: 1, shiftId: shift.id, shiftName: shift.name, notes: "No punch logged" };
  }

  // Single Punch Handling (Tab 03 / Tab 07)
  if (inMin !== null && outMin === null) {
    const rawLate = Math.max(0, inMin - shiftStartMin);
    const isLate = lateRule.enabled && !policy.isExemptLate && rawLate > policy.graceMinutes;
    const lateMinutes = isLate
      ? lateRule.deductFrom === "ShiftStart"
        ? rawLate
        : rawLate - policy.graceMinutes
      : 0;

    let status = workMode === "WFH" ? "WFH" : workMode === "On-Duty" ? "On-Duty" : isLate ? "Late" : "Present";
    if (holidayMatch) status = "Holiday Work";
    else if (weeklyOff) status = "Off-Day Work";

    return {
      status,
      isLate,
      lateMinutes,
      isHalfDay: false,
      earlyLeaveMinutes: 0,
      hoursWorked: 0,
      overtimeHours: 0,
      overtimeMinutes: 0,
      overtimeMultiplier: holidayMatch ? otRule.publicHolidayMultiplier : weeklyOff ? otRule.weeklyOffMultiplier : otRule.workingDayMultiplier,
      shiftId: shift.id,
      shiftName: shift.name,
      shiftAllowance: Number(shift.shiftAllowance || 0),
    };
  }

  // Both Clock In & Clock Out present
  const rawMinutesWorked = Math.max(0, outMin - inMin);
  const netMinutesWorked = attRule.breakPaid
    ? rawMinutesWorked
    : Math.max(0, rawMinutesWorked - (rawMinutesWorked > 300 ? Number(shift.breakMinutes || 0) : 0));
  const hoursWorked = Number((rawMinutesWorked / 60).toFixed(2));
  const netHoursWorked = Number((netMinutesWorked / 60).toFixed(2));

  // Late calculation
  const rawLate = Math.max(0, inMin - shiftStartMin);
  const isLate = lateRule.enabled && !policy.isExemptLate && rawLate > policy.graceMinutes;
  const lateMinutes = isLate
    ? lateRule.deductFrom === "ShiftStart"
      ? rawLate
      : rawLate - policy.graceMinutes
    : 0;

  // Early leave calculation
  const earlyLeaveMinutes = Math.max(0, shiftEndMin - outMin);

  // Half-Day / Absent threshold checks (Tab 07)
  let isHalfDay = false;
  let isAbsentThreshold = false;

  if (!holidayMatch && !weeklyOff) {
    if (hoursWorked < Number(halfRule.hoursBasedAbsentMin || 2) || rawLate >= Number(halfRule.lateAbsentAfterMinutes || 240)) {
      isAbsentThreshold = true;
    } else if (
      hoursWorked < Number(attRule.minHoursHalfDay || halfRule.hoursBasedHalfDayMin || 5) ||
      rawLate >= Number(halfRule.lateHalfDayAfterMinutes || 90) ||
      earlyLeaveMinutes >= Number(halfRule.earlyHalfDayBeforeMinutes || 90)
    ) {
      isHalfDay = true;
    }
  }

  // Overtime Calculation (Tab 05)
  let overtimeMinutes = 0;
  let overtimeMultiplier = otRule.workingDayMultiplier || 1.5;
  let overtimeType = "Normal";

  if (policy.overtimeEligible) {
    if (holidayMatch) {
      overtimeMinutes = rawMinutesWorked;
      overtimeMultiplier = otRule.publicHolidayMultiplier || 2.0;
      overtimeType = "Public Holiday";
    } else if (weeklyOff) {
      overtimeMinutes = rawMinutesWorked;
      overtimeMultiplier = otRule.weeklyOffMultiplier || 2.0;
      overtimeType = "Weekly Off";
    } else {
      const afterShiftExtra = Math.max(0, outMin - shiftEndMin);
      const beforeShiftExtra = Math.max(0, shiftStartMin - inMin);
      const bufferAfter = Number(otRule.afterShiftBufferMinutes || 30);
      const bufferBefore = Number(otRule.beforeShiftBufferMinutes || 30);
      const eligibleAfter = afterShiftExtra >= bufferAfter ? afterShiftExtra : 0;
      const eligibleBefore = beforeShiftExtra >= bufferBefore ? beforeShiftExtra : 0;
      let totalExtra = eligibleAfter + eligibleBefore;

      if (otRule.netLateAgainstOt && lateMinutes > 0) {
        totalExtra = Math.max(0, totalExtra - lateMinutes);
      }

      if (totalExtra >= Number(otRule.minOtMinutes || 30)) {
        const rounding = Number(otRule.roundingMinutes || 0);
        if (rounding > 0) {
          totalExtra = Math.floor(totalExtra / rounding) * rounding;
        }
        overtimeMinutes = Math.min(totalExtra, Number(otRule.maxDailyOtHours || 4) * 60);
      }
      if (shift.type === "Night" || shift.crossesMidnight) {
        overtimeMultiplier = otRule.nightOtMultiplier || 1.75;
        overtimeType = "Night Shift";
      }
    }
  }

  const overtimeHours = Number((overtimeMinutes / 60).toFixed(2));

  let status = "Present";
  if (holidayMatch) status = "Holiday Work";
  else if (weeklyOff) status = "Off-Day Work";
  else if (isAbsentThreshold) status = "Absent";
  else if (isHalfDay) status = "Half-Day";
  else if (workMode === "WFH") status = "WFH";
  else if (workMode === "On-Duty") status = "On-Duty";
  else if (isLate) status = "Late";

  return {
    status,
    isLate,
    lateMinutes,
    isHalfDay,
    earlyLeaveMinutes,
    hoursWorked,
    netHoursWorked,
    scheduledHours: Number((scheduledMinutes / 60).toFixed(2)),
    overtimeMinutes,
    overtimeHours,
    overtimeMultiplier,
    overtimeType,
    shiftId: shift.id,
    shiftName: shift.name,
    shiftAllowance: Number(shift.shiftAllowance || 0),
  };
}

/**
 * Tab 02: Compute pull status when comparing Biometric Device Users vs HR Employees
 */
export function computeDeviceUserPullStatus(deviceUser, employees = []) {
  if (!deviceUser?.enabled) return "Disabled";
  const devUid = String(deviceUser.deviceUserId || "").trim();
  const matches = employees.filter(
    (e) => String(e.deviceUserId || "").trim() === devUid
  );
  if (matches.length > 1) return "Duplicate ID";
  if (matches.length === 1) {
    const emp = matches[0];
    const cleanEmp = String(emp.name || "").trim().toLowerCase();
    const cleanDev = String(deviceUser.name || "").trim().toLowerCase();
    if (cleanEmp && cleanDev && cleanEmp !== cleanDev) {
      return "Name Mismatch";
    }
    return "Already Mapped";
  }
  return "New";
}

/**
 * Tabs 08 & 09: Evaluate Leave Application against Holidays, Weekly Offs, Blackouts, Notice, Quotas, & Sandwich Rule
 */
export function evaluateLeaveRequest({
  config = DEFAULT_HCM_CONFIG,
  employee = {},
  leaveType = "Annual",
  startDate = "",
  endDate = "",
  holidays = null,
  balances = {},
  existingRequests = [],
  asOfDate = null,
}) {
  const errors = [];
  const warnings = [];
  const effectiveHolidays = holidays || config?.holidays || DEFAULT_HCM_CONFIG.holidays;
  const leavePolicy = config?.leavePolicy || DEFAULT_HCM_CONFIG.leavePolicy;

  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return {
      valid: false,
      errors: ["Invalid date range: End date must be on or after start date."],
      warnings: [],
      workingDays: 0,
      chargeableDays: 0,
      skippedWeekends: 0,
      skippedHolidays: 0,
      sandwichDaysAdded: 0,
      requiresDocument: false,
    };
  }

  // Check overlapping requests
  const hasOverlap = existingRequests.some((r) => {
    if (
      r.employeeId !== employee.id ||
      r.status === "Rejected" ||
      r.status === "Cancelled"
    ) {
      return false;
    }
    return startDate <= r.endDate && endDate >= r.startDate;
  });
  if (hasOverlap) {
    errors.push("Overlapping leave request already exists in this date range.");
  }

  // Notice & Back-dated check
  const refDateStr = asOfDate || new Date().toISOString().split("T")[0];
  const refDate = new Date(`${refDateStr}T12:00:00Z`);
  const diffDays = Math.round((start.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0 && Math.abs(diffDays) > Number(leavePolicy.backDatedLimitDays ?? 7)) {
    errors.push(
      `Back-dated leave exceeds the ${leavePolicy.backDatedLimitDays}-day limit.`
    );
  }
  if (
    leaveType === "Annual" &&
    diffDays >= 0 &&
    diffDays < Number(leavePolicy.minNoticeDays || 0)
  ) {
    warnings.push(
      `Annual leave normally requires ${leavePolicy.minNoticeDays} day(s) advance notice.`
    );
  }

  // Probation eligibility check
  const typeMeta = (leavePolicy.leaveTypes || []).find(
    (t) =>
      t.code.toLowerCase() === leaveType.toLowerCase() ||
      t.name.toLowerCase() === leaveType.toLowerCase()
  );
  if (
    employee?.employeeType === "Probation" &&
    typeMeta &&
    typeMeta.probationAllowed === false
  ) {
    errors.push(`${leaveType} leave is not allowed during Probation period.`);
  }

  // Walk date range
  let workingDays = 0;
  let skippedWeekends = 0;
  let skippedHolidays = 0;
  const blackoutHits = [];
  const totalCalendarDays =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = cursor.toISOString().split("T")[0];
    if (Array.isArray(leavePolicy.blackoutDates) && leavePolicy.blackoutDates.includes(iso)) {
      blackoutHits.push(iso);
    }
    const hol = isHolidayForEmployee(effectiveHolidays, employee, iso);
    const off = isWeeklyOffForEmployee(config, employee, iso);
    if (hol) {
      skippedHolidays++;
    } else if (off) {
      skippedWeekends++;
    } else {
      workingDays++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (blackoutHits.length > 0) {
    errors.push(`Selected period includes blackout dates: ${blackoutHits.join(", ")}.`);
  }

  // Sandwich rule (Tab 09 / Tab 07): count sandwiched offs/holidays when leave wraps across them
  let sandwichDaysAdded = 0;
  if (
    leavePolicy.sandwichRuleApplied &&
    workingDays >= 2 &&
    skippedWeekends + skippedHolidays > 0
  ) {
    sandwichDaysAdded = skippedWeekends + skippedHolidays;
    warnings.push(
      `Sandwich Rule active: ${sandwichDaysAdded} weekend/holiday day(s) between leave days are counted.`
    );
  }

  const chargeableDays = workingDays + sandwichDaysAdded;
  if (chargeableDays <= 0) {
    errors.push("Selected date range contains only holidays or weekly off days.");
  }

  // Document requirement check (e.g. Sick > 2 days)
  const requiresDocument =
    leaveType.toLowerCase().includes("sick") &&
    chargeableDays > Number(leavePolicy.medicalCertAfterDays || 2);
  if (requiresDocument) {
    warnings.push(
      `Medical certificate required for Sick Leave exceeding ${leavePolicy.medicalCertAfterDays} days.`
    );
  }

  // Balance check
  const typeKey = leaveType.toLowerCase().includes("sick")
    ? "sick"
    : leaveType.toLowerCase().includes("casual")
    ? "casual"
    : leaveType.toLowerCase().includes("comp")
    ? "compOff"
    : leaveType.toLowerCase().includes("unpaid")
    ? "unpaid"
    : "annual";

  if (typeKey !== "unpaid") {
    const remaining = Number(balances?.[typeKey] ?? typeMeta?.quota ?? 0);
    if (chargeableDays > remaining && !leavePolicy.negativeBalanceAllowed) {
      errors.push(
        `Exceeded quota: Requested ${chargeableDays} days, remaining ${typeKey} balance is ${remaining}.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalCalendarDays,
    workingDays,
    chargeableDays,
    skippedWeekends,
    skippedHolidays,
    sandwichDaysAdded,
    requiresDocument,
  };
}

/**
 * Tab 10: Calculate Employee Monthly Payroll using configured Salary Setup + Late + OT + Tax Slabs
 */
export function calculateEmployeeMonthlyPayroll({
  config = DEFAULT_HCM_CONFIG,
  employee = {},
  attendanceRecords = [],
  approvedLeaves = [],
  periodStart = null,
  periodEnd = null,
  customBonus = 0,
  customDeduction = 0,
}) {
  const salSetup = config?.salarySetup || DEFAULT_HCM_CONFIG.salarySetup;
  const attRule = config?.attendanceRule || DEFAULT_HCM_CONFIG.attendanceRule;
  const lateRule = config?.latePolicy || DEFAULT_HCM_CONFIG.latePolicy;
  const otRule = config?.overtimePolicy || DEFAULT_HCM_CONFIG.overtimePolicy;

  const annualSalary = Number(employee.annualSalary) || Number(employee.salary) || 120000;
  let monthlyGross = annualSalary / 12;

  // Earnings split (maintaining Basic * 1.5 compatibility while honoring Tab 10 allowances)
  const hraPct = Number(salSetup.hraPercentOfBasic ?? 40) / 100;
  const medPct = Number(salSetup.medicalPercentOfBasic ?? 10) / 100;
  const utilPct = Number(salSetup.utilitiesPercentOfBasic ?? 0) / 100;
  const multiplier = 1 + hraPct + medPct + utilPct;
  const basicSalary = monthlyGross / (multiplier || 1.5);
  const hra = basicSalary * hraPct;
  const medical = basicSalary * medPct;
  const utilities = basicSalary * utilPct;
  const transportAllowance = Number(salSetup.transportAllowanceFixed || 0);

  // Shift Allowance from assigned shift
  const shift = resolveEmployeeShift(config, employee);
  const shiftAllowance = Number(shift?.shiftAllowance || 0);

  const grossWithAllowances = monthlyGross + transportAllowance + shiftAllowance;

  // Tab 10 Salary Calculation Method (Daily & Hourly Rates)
  let periodWorkingDays = Number(salSetup.fixedDaysCount || attRule.fixedWorkingDaysCount || 22);
  if (salSetup.calculationMethod === "Fixed30") periodWorkingDays = 30;
  else if (salSetup.calculationMethod === "Fixed26") periodWorkingDays = 26;
  else if (salSetup.calculationMethod === "CalendarDays") {
    const ref = periodStart ? new Date(periodStart) : new Date();
    periodWorkingDays = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  } else if (salSetup.calculationMethod === "Yearly365") {
    periodWorkingDays = 365 / 12;
  }

  const deductionBaseAmount =
    salSetup.deductionBase === "Basic" ? basicSalary : monthlyGross;
  const perDayRate = deductionBaseAmount / (periodWorkingDays || 22);
  const hourlyRate = perDayRate / Number(attRule.minHoursFullDay || 8);

  // Pro-rata for new joiners within the period
  let proRataDeduction = 0;
  if (salSetup.proRataJoinerLeaver && employee.hireDate && periodStart && periodEnd) {
    if (employee.hireDate > periodStart && employee.hireDate <= periodEnd) {
      const pStart = new Date(`${periodStart}T12:00:00Z`);
      const hire = new Date(`${employee.hireDate}T12:00:00Z`);
      const unworkedDays = Math.max(0, Math.round((hire - pStart) / (1000 * 60 * 60 * 24)));
      proRataDeduction = unworkedDays * perDayRate;
    }
  }

  // Filter attendance logs for employee
  const empAtt = attendanceRecords.filter((a) => a.employeeId === employee.id);
  const absentDays = empAtt.filter((a) => a.status === "Absent").length;
  const halfDays = empAtt.filter((a) => a.isHalfDay || a.status === "Half-Day").length;
  const lateRecords = empAtt.filter((a) => a.isLate || a.status === "Late");
  const lateCount = lateRecords.length;
  const totalLateMinutes = lateRecords.reduce((sum, r) => sum + Number(r.lateMinutes || 0), 0);

  // Unpaid leaves
  const unpaidDaysFromLeaves = approvedLeaves
    .filter(
      (l) =>
        l.employeeId === employee.id &&
        l.status === "Approved" &&
        l.leaveType === "Unpaid"
    )
    .reduce((sum, l) => sum + Number(l.daysCount || 0), 0);
  const unpaidAttendanceDays = empAtt.filter((a) => a.status === "Unpaid").length;
  const unpaidDays = unpaidDaysFromLeaves + unpaidAttendanceDays;

  // Tab 04: Late Penalty Calculation
  let latePenaltyDays = 0;
  let lateMinuteDeduction = 0;
  if (lateRule.enabled && lateCount > 0) {
    if (
      lateRule.frequencyPenaltyEnabled &&
      lateRule.frequencyPenaltyThreshold > 0 &&
      lateCount >= lateRule.frequencyPenaltyThreshold
    ) {
      const blocks = Math.floor(lateCount / lateRule.frequencyPenaltyThreshold);
      latePenaltyDays = blocks * Number(lateRule.frequencyPenaltyDays || 0.5);
    }
    if (lateRule.deductionMethod === "ActualMinutes") {
      lateMinuteDeduction = (totalLateMinutes / 60) * hourlyRate;
    } else if (lateRule.deductionMethod === "FixedAmount") {
      lateMinuteDeduction = lateCount * Number(lateRule.fixedPenaltyAmount || 25);
    } else if (lateRule.deductionMethod === "FullHour") {
      lateMinuteDeduction = lateCount * hourlyRate;
    }
  }

  // Tab 05: Overtime Earnings
  const otRateBaseAmount = otRule.rateBase === "Gross" ? monthlyGross : basicSalary;
  const otHourlyBase = otRateBaseAmount / ((periodWorkingDays || 22) * Number(attRule.minHoursFullDay || 8));
  let overtimeHours = 0;
  let overtimePay = 0;
  if (otRule.enabled && otRule.compensationType === "Cash") {
    empAtt.forEach((rec) => {
      const hrs = Number(rec.overtimeHours || 0);
      const mult = Number(rec.overtimeMultiplier || otRule.workingDayMultiplier || 1.5);
      if (hrs > 0) {
        overtimeHours += hrs;
        overtimePay += hrs * otHourlyBase * mult;
      }
    });
  }

  // Attendance deduction (absent + unpaid + 0.5 * half-days + late frequency penalty days)
  const penaltyUnits = absentDays + unpaidDays + 0.5 * halfDays + latePenaltyDays;
  const attendanceDeduction =
    penaltyUnits * perDayRate + lateMinuteDeduction + proRataDeduction;

  // Statutory PF / EOBI + Annualized Tax Slab
  const pfDeduction = (basicSalary * Number(salSetup.pfPercent || 0)) / 100;
  const eobiDeduction = Number(salSetup.eobiFixed || 0);

  const totalGrossWithExtras =
    grossWithAllowances + overtimePay + Number(customBonus || 0);

  const annualizedGross = totalGrossWithExtras * 12;
  const slabs = Array.isArray(salSetup.taxSlabs) && salSetup.taxSlabs.length > 0
    ? salSetup.taxSlabs
    : TAX_SLABS;

  let annualTax = 0;
  for (const slab of slabs) {
    const maxVal = slab.max === null || slab.max === undefined ? Infinity : Number(slab.max);
    if (annualizedGross <= maxVal) {
      annualTax = Number(slab.baseTax || 0) + Math.max(0, annualizedGross - Number(slab.min || 0)) * Number(slab.rate || 0);
      break;
    }
  }
  const monthlyTax = annualTax / 12;

  const totalDeductions =
    attendanceDeduction + monthlyTax + pfDeduction + eobiDeduction + Number(customDeduction || 0);
  let netPay = Math.max(0, totalGrossWithExtras - totalDeductions);

  if (salSetup.roundingMode === "Floor") netPay = Math.floor(netPay);
  else if (salSetup.roundingMode === "Ceil") netPay = Math.ceil(netPay);

  return {
    calculationMethod: salSetup.calculationMethod,
    basicSalary: Number(basicSalary.toFixed(2)),
    hra: Number(hra.toFixed(2)),
    medical: Number(medical.toFixed(2)),
    utilities: Number(utilities.toFixed(2)),
    transportAllowance: Number(transportAllowance.toFixed(2)),
    shiftAllowance: Number(shiftAllowance.toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2)),
    overtimePay: Number(overtimePay.toFixed(2)),
    customBonus: Number(customBonus || 0),
    totalGross: Number(totalGrossWithExtras.toFixed(2)),
    grossSalary: Number(totalGrossWithExtras.toFixed(2)),
    periodGross: Number(totalGrossWithExtras.toFixed(2)),
    workingDays: Number(periodWorkingDays.toFixed(1)),
    perDayDeduction: Number(perDayRate.toFixed(2)),
    absentDays,
    unpaidDays,
    halfDays,
    lateCount,
    latePenaltyDays,
    lateMinuteDeduction: Number(lateMinuteDeduction.toFixed(2)),
    proRataDeduction: Number(proRataDeduction.toFixed(2)),
    penaltyUnits: Number(penaltyUnits.toFixed(2)),
    attendanceDeduction: Number(attendanceDeduction.toFixed(2)),
    pfDeduction: Number(pfDeduction.toFixed(2)),
    eobiDeduction: Number(eobiDeduction.toFixed(2)),
    tax: Number(monthlyTax.toFixed(2)),
    totalTaxes: Number(monthlyTax.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    netPay: Number(netPay.toFixed(2)),
  };
}
