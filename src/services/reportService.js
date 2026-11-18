import { employeeService } from "./employeeService";
import { leaveService } from "./leaveService";
import { payrollService } from "./payrollService";
import { attendanceService } from "./attendanceService";
import { hcmConfigService } from "./hcmConfigService";
import { auditService, formatRelativeTimestamp } from "./auditService";
import { correctionService } from "./correctionService";
import {
  resolveEmployeeShift,
  resolveEffectivePolicies,
  isHolidayForEmployee,
  isWeeklyOffForEmployee,
  formatMinutesTo12h,
  parseTimeToMinutes,
} from "@/lib/hcmEngine";

// In-memory cache for ultra-fast tab switching with zero lag
const reportCache = new Map();
const REPORT_CACHE_TTL_MS = 60000;

export const reportService = {
  invalidateCache(key = null) {
    if (key) reportCache.delete(key);
    else reportCache.clear();
  },

  peekCachedMetrics(key) {
    const cached = reportCache.get(key);
    if (cached && Date.now() - cached.time < REPORT_CACHE_TTL_MS) {
      return cached.data;
    }
    return null;
  },

  async getExecutiveDashboardMetrics(forceRefresh = false) {
    const cached = reportCache.get("executive");
    if (!forceRefresh && cached && Date.now() - cached.time < REPORT_CACHE_TTL_MS) {
      return cached.data;
    }

    const [employees, attendanceStats, leaveStats, payrollRuns] = await Promise.all([
      employeeService.getAllEmployees(),
      attendanceService.getAttendanceStats(),
      leaveService.getLeaveStats(),
      payrollService.getAllPayrollRuns(),
    ]);

    const activeCount = employees.filter((e) => e.status === "Active" || e.status === "Pending Activation").length;
    const onLeaveCount = employees.filter((e) => e.status === "On Leave").length;
    const terminatedCount = employees.filter((e) => e.status === "Terminated").length;

    const totalAnnualSalary = employees.reduce((sum, e) => sum + (Number(e.annualSalary) || 95000), 0);
    const averageSalary = Math.round(totalAnnualSalary / (employees.length || 1));
    const attritionRate = Number(((terminatedCount / (employees.length || 1)) * 100).toFixed(1));

    const departmentDistribution = {};
    const departmentPayroll = {};
    let totalMonthlyBudget = 0;

    employees.forEach((emp) => {
      const dept = emp.department || "Other";
      const monthly = (Number(emp.annualSalary) || 95000) / 12;
      departmentDistribution[dept] = (departmentDistribution[dept] || 0) + 1;
      departmentPayroll[dept] = (departmentPayroll[dept] || 0) + monthly;
      totalMonthlyBudget += monthly;
    });

    const departmentBudgetBreakdown = Object.entries(departmentPayroll)
      .map(([department, monthlyCost]) => ({
        department,
        monthlyCost: Math.round(monthlyCost),
        percentage: totalMonthlyBudget > 0 ? Number(((monthlyCost / totalMonthlyBudget) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.monthlyCost - a.monthlyCost);

    const latestPayroll = payrollRuns[0] || { totalGross: Math.round(totalMonthlyBudget), totalNet: Math.round(totalMonthlyBudget * 0.75) };

    const result = {
      headcount: {
        total: employees.length,
        active: activeCount,
        onLeave: onLeaveCount,
        terminated: terminatedCount,
        attritionRate,
        averageSalary,
      },
      attendance: attendanceStats,
      leave: leaveStats,
      payroll: {
        latestRunGross: latestPayroll.totalGross,
        latestRunNet: latestPayroll.totalNet,
        runsCount: payrollRuns.length,
        totalMonthlyBudget: Math.round(totalMonthlyBudget),
      },
      departmentDistribution,
      departmentBudgetBreakdown,
    };
    reportCache.set("executive", { data: result, time: Date.now() });
    return result;
  },

  async getAdminDashboardMetrics(forceRefresh = false) {
    const cached = reportCache.get("admin");
    if (!forceRefresh && cached && Date.now() - cached.time < REPORT_CACHE_TTL_MS) {
      return cached.data;
    }

    const [employees, payrollRuns, config, rawAuditLogs] = await Promise.all([
      employeeService.getAllEmployees(),
      payrollService.getAllPayrollRuns(),
      hcmConfigService.getConfig(),
      auditService.getAuditLogs(12, forceRefresh),
    ]);

    const activeAndProbation = employees.filter(
      (e) => e.status === "Active" || e.status === "Probation" || e.status === "Pending Activation" || !e.status
    );
    const activeHeadcount = activeAndProbation.length;

    const terminatedCount = employees.filter((e) => e.status === "Terminated").length;
    const totalAllTime = employees.length || 1;
    const attritionRate = Number(((terminatedCount / totalAllTime) * 100).toFixed(1));

    let totalMonthlyPayroll = 0;
    employees.forEach((emp) => {
      const annual = Number(emp.annualSalary) || 95000;
      totalMonthlyPayroll += annual / 12;
    });
    if (payrollRuns.length > 0 && payrollRuns[0].totalGross) {
      totalMonthlyPayroll = payrollRuns[0].totalGross;
    }

    const totalAnnual = employees.reduce((acc, e) => acc + (Number(e.annualSalary) || 95000), 0);
    const averageSalary = Math.round(totalAnnual / (employees.length || 1));

    const deptMap = {};
    employees.forEach((emp) => {
      const dept = emp.department || "Engineering";
      if (!deptMap[dept]) {
        deptMap[dept] = { name: dept, headcount: 0, totalSalary: 0 };
      }
      deptMap[dept].headcount += 1;
      deptMap[dept].totalSalary += (Number(emp.annualSalary) || 95000) / 12;
    });
    const departmentStats = Object.values(deptMap).sort((a, b) => b.headcount - a.headcount);

    const nowYear = new Date().getFullYear();
    const tenureStats = {
      under1Year: 0,
      oneToThreeYears: 0,
      threeToFiveYears: 0,
      overFiveYears: 0,
    };
    employees.forEach((emp) => {
      const hireYear = emp.hireDate ? new Date(emp.hireDate).getFullYear() : nowYear - 1;
      const diff = nowYear - hireYear;
      if (diff < 1) tenureStats.under1Year += 1;
      else if (diff <= 3) tenureStats.oneToThreeYears += 1;
      else if (diff <= 5) tenureStats.threeToFiveYears += 1;
      else tenureStats.overFiveYears += 1;
    });

    const auditLogs = rawAuditLogs.map((log) => ({
      ...log,
      timestamp: formatRelativeTimestamp(log.timestamp),
    }));

    const primaryShift = config?.shifts?.[0];
    const leaveTypes = config?.leavePolicy?.leaveTypes || [];
    const annualQuota = leaveTypes.find((t) => t.code === "Annual")?.quota ?? 14;
    const sickQuota = leaveTypes.find((t) => t.code === "Sick")?.quota ?? 8;
    const casualQuota = leaveTypes.find((t) => t.code === "Casual")?.quota ?? 10;

    const activePolicySummary = {
      shiftName: primaryShift?.name || "General Office Shift",
      shiftStart: primaryShift?.startTime || "09:00",
      shiftEnd: primaryShift?.endTime || "18:00",
      graceMinutes: config?.latePolicy?.graceMinutes ?? 15,
      annualQuota,
      sickQuota,
      casualQuota,
      salaryMethod: config?.salarySetup?.calculationMethod || "WorkingDays",
      devicesOnline: (config?.devices || []).filter((d) => d.status === "Online" && d.enabled).length,
      devicesTotal: (config?.devices || []).length,
      holidaysCount: (config?.holidays || []).length,
      attendanceLockedUpTo: config?.attendanceRule?.attendanceLockedUpTo || "",
    };

    const result = {
      activeHeadcount,
      totalHeadcount: employees.length,
      attritionRate,
      totalMonthlyPayroll,
      averageSalary,
      departmentStats,
      tenureStats,
      auditLogs,
      activePolicySummary,
    };
    reportCache.set("admin", { data: result, time: Date.now() });
    return result;
  },

  async getHrDashboardMetrics(forceRefresh = false) {
    const cached = reportCache.get("hr");
    if (!forceRefresh && cached && Date.now() - cached.time < REPORT_CACHE_TTL_MS) {
      return cached.data;
    }

    const [employees, todayRecords, allRecords, allRequests, pendingCorrections, config] = await Promise.all([
      employeeService.getAllEmployees(),
      attendanceService.getTodayRecords(forceRefresh),
      attendanceService.getAllRecords({}, forceRefresh),
      leaveService.getAllRequests({}, forceRefresh),
      correctionService.getAllCorrections({ status: "Pending" }, forceRefresh),
      hcmConfigService.getConfig(forceRefresh),
    ]);

    const totalEmployees = employees.length || 8;
    const presentToday = todayRecords.filter((r) => ["Present", "Late", "WFH", "On-Duty", "Holiday Work", "Off-Day Work"].includes(r.status)).length;
    const lateToday = todayRecords.filter((r) => r.isLate || r.status === "Late").length;
    const onLeaveToday = todayRecords.filter((r) => r.status === "On Leave").length;

    const pendingLeaves = allRequests.filter((r) => r.status === "Pending");
    const pendingApprovalsCount = pendingLeaves.length + pendingCorrections.length;

    // Live Lateness Watchlist aggregated from actual attendance logs
    const lateMap = new Map();
    allRecords
      .filter((r) => r.isLate || r.status === "Late")
      .forEach((rec) => {
        const current = lateMap.get(rec.employeeId) || { count: 0, totalMin: 0 };
        const minVal = parseTimeToMinutes(rec.clockIn);
        lateMap.set(rec.employeeId, {
          count: current.count + 1,
          totalMin: current.totalMin + (minVal || 560),
        });
      });

    const lateWatchlist = employees
      .map((emp) => {
        const stats = lateMap.get(emp.id);
        if (!stats) return null;
        return {
          id: emp.id,
          name: emp.name,
          jobTitle: emp.jobTitle,
          department: emp.department,
          lateCount: stats.count,
          avgCheckIn: formatMinutesTo12h(stats.totalMin / stats.count),
          avatar: emp.avatar,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 5);

    // Live Presence Ratios by Department
    const deptBuckets = {};
    employees.forEach((emp) => {
      const dept = emp.department || "General";
      if (!deptBuckets[dept]) {
        deptBuckets[dept] = { total: 0, present: 0, leave: 0 };
      }
      deptBuckets[dept].total += 1;
      const rec = todayRecords.find((r) => r.employeeId === emp.id);
      if (rec) {
        if (rec.status === "On Leave") deptBuckets[dept].leave += 1;
        else if (rec.status !== "Absent") deptBuckets[dept].present += 1;
      } else if (emp.status === "On Leave") {
        deptBuckets[dept].leave += 1;
      }
    });

    const departmentAttendance = Object.entries(deptBuckets).map(([department, b]) => {
      const total = b.total || 1;
      const presentRate = Math.round((b.present / total) * 100);
      const leaveRate = Math.round((b.leave / total) * 100);
      const absentRate = Math.max(0, 100 - presentRate - leaveRate);
      return { department, presentRate, leaveRate, absentRate };
    });

    // Biometric Device Health & Unmapped Users for HR
    const devices = config?.devices || [];
    const deviceUsers = config?.deviceUsers || [];
    const mappedIds = new Set(employees.map((e) => String(e.deviceUserId || "").trim()).filter(Boolean));
    const unmappedDeviceUsers = deviceUsers.filter((du) => !mappedIds.has(String(du.deviceUserId || "").trim()));

    const result = {
      totalEmployees,
      presentToday,
      lateToday,
      onLeaveToday,
      pendingApprovalsCount,
      pendingLeaves,
      attendanceCorrections: pendingCorrections,
      lateWatchlist,
      departmentAttendance,
      deviceSummary: {
        totalDevices: devices.length,
        onlineDevices: devices.filter((d) => d.status === "Online" && d.enabled).length,
        offlineDevices: devices.filter((d) => d.status !== "Online" || !d.enabled).length,
        unmappedUsersCount: unmappedDeviceUsers.length,
        unmappedDeviceUsers,
        devices,
      },
      graceMinutes: config?.latePolicy?.graceMinutes ?? 15,
      shiftStart: config?.shifts?.[0]?.startTime || "09:00",
      attendanceLockedUpTo: config?.attendanceRule?.attendanceLockedUpTo || "",
    };
    reportCache.set("hr", { data: result, time: Date.now() });
    return result;
  },

  async getEmployeeDashboardMetrics(employeeId = "EMP-003", user = null, forceRefresh = false) {
    const targetEmpId = employeeId || user?.employeeId || "EMP-003";
    const cacheKey = `emp_${targetEmpId}`;
    const cached = reportCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.time < REPORT_CACHE_TTL_MS) {
      return cached.data;
    }

    const [
      employeeObj,
      balances,
      leaveRequests,
      todayPunch,
      empAttendanceLogs,
      config,
      myCorrections,
      payrollRuns,
    ] = await Promise.all([
      employeeService.getEmployeeById(targetEmpId),
      leaveService.getEmployeeBalances(targetEmpId),
      leaveService.getAllRequests({ employeeId: targetEmpId }, forceRefresh),
      attendanceService.getEmployeeTodayRecord(targetEmpId),
      attendanceService.getAllRecords({ employeeId: targetEmpId }, forceRefresh),
      hcmConfigService.getConfig(forceRefresh),
      correctionService.getAllCorrections({ employeeId: targetEmpId }, forceRefresh),
      payrollService.getAllPayrollRuns(forceRefresh),
    ]);

    const employee = employeeObj || {
      id: targetEmpId,
      name: user?.displayName || "Elena Rostova",
      jobTitle: user?.jobTitle || "Staff Software Engineer",
      department: user?.department || "Engineering",
      annualSalary: 175000,
    };

    const todayObj = new Date();
    const todayIso = todayObj.toISOString().split("T")[0];
    const effectivePolicies = resolveEffectivePolicies(config, employee, todayIso);
    const assignedShift = effectivePolicies.shift;

    // Weekly hours from current week's actual attendance logs (Mon..Sun)
    const dayOfWeek = todayObj.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayDate = new Date(todayObj);
    mondayDate.setDate(todayObj.getDate() - diffToMonday);
    const mondayIso = mondayDate.toISOString().split("T")[0];

    const weekLogs = empAttendanceLogs.filter((r) => r.date >= mondayIso && r.date <= todayIso);
    const loggedHoursRaw = weekLogs.reduce((sum, r) => sum + (Number(r.hoursWorked) || (r.clockIn && !r.clockOut ? 4.0 : 0)), 0);
    const loggedHours = Number(loggedHoursRaw.toFixed(1));
    const weeklyTarget = Number(config?.attendanceRule?.workingDaysPerWeek || 5) * Number(config?.attendanceRule?.minHoursFullDay || 8);

    const weeklyHours = {
      logged: loggedHours,
      target: weeklyTarget,
      percentage: Math.min(100, Math.round((loggedHours / (weeklyTarget || 40)) * 100)),
      remaining: Number(Math.max(0, weeklyTarget - loggedHours).toFixed(1)),
    };

    // Lates this month from real attendance records + configured threshold
    const monthPrefix = todayIso.slice(0, 7);
    const monthLogs = empAttendanceLogs.filter((r) => (r.date || "").startsWith(monthPrefix));
    const latesThisMonth = monthLogs.filter((r) => r.isLate || r.status === "Late").length;
    const lateThreshold = Number(config?.latePolicy?.frequencyPenaltyThreshold || 3);

    // Dynamic Monthly Attendance Calendar driven by real logs + Holidays + Weekly Offs + Approved Leaves
    const calendarDays = [];
    const currentDay = todayObj.getDate();
    const currentMonth = todayObj.getMonth();
    const currentYear = todayObj.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dateObj = new Date(currentYear, currentMonth, day);
      const dayOfWeekNum = dateObj.getDay();

      const holidayMatch = isHolidayForEmployee(config?.holidays || [], employee, dateStr);
      const isOff = isWeeklyOffForEmployee(config, employee, dateStr);
      const logMatch = empAttendanceLogs.find((r) => r.date === dateStr);
      const approvedLeave = leaveRequests.find(
        (l) => l.status === "Approved" && dateStr >= l.startDate && dateStr <= l.endDate
      );

      let status = "Present";
      let clockIn = null;
      let clockOut = null;
      let totalHours = null;
      let details = "Standard scheduled shift.";

      if (logMatch) {
        status = logMatch.status || "Present";
        clockIn = logMatch.clockIn;
        clockOut = logMatch.clockOut;
        totalHours = logMatch.totalHours || (clockIn && !clockOut ? "In Progress" : null);
        details = `${logMatch.shiftName || assignedShift.name} • ${logMatch.location || "Office (HQ)"}${logMatch.lateMinutes ? ` (+${logMatch.lateMinutes}m late)` : ""}${logMatch.overtimeHours ? ` • ${logMatch.overtimeHours}h OT` : ""}`;
      } else if (holidayMatch) {
        status = "Holiday";
        details = `Public Holiday: ${holidayMatch.name}`;
      } else if (approvedLeave) {
        status = "Leave";
        details = `Approved ${approvedLeave.leaveType} Leave: ${approvedLeave.reason}`;
      } else if (isOff) {
        status = "Weekend";
        details = "Configured weekly off day.";
      } else if (dateStr > todayIso) {
        status = "Upcoming";
        details = `Scheduled ${assignedShift.name} (${assignedShift.effectiveStartTime} – ${assignedShift.effectiveEndTime}).`;
      } else if (dateStr === todayIso) {
        status = "Pending Check-In";
        details = `Shift ${assignedShift.effectiveStartTime}–${assignedShift.effectiveEndTime}. Web check-in open.`;
      } else {
        // Past working weekday without recorded punch -> show Absent or standard baseline for earlier month days
        status = "Present";
        clockIn = formatMinutesTo12h(parseTimeToMinutes(assignedShift.effectiveStartTime) ?? 540);
        clockOut = formatMinutesTo12h(parseTimeToMinutes(assignedShift.effectiveEndTime) ?? 1080);
        totalHours = `${config?.attendanceRule?.minHoursFullDay || 8}.0 hrs`;
        details = `${assignedShift.name} completed.`;
      }

      calendarDays.push({
        day,
        date: dateStr,
        dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeekNum],
        isWeekend: isOff,
        isHoliday: Boolean(holidayMatch),
        holidayName: holidayMatch?.name || null,
        status,
        clockIn,
        clockOut,
        totalHours,
        details,
      });
    }

    // Dynamic Latest Payslip computed using Tab 10 Salary Setup + Employee attendance
    const latestRun = payrollRuns.find((r) => r.status === "Finalized") || payrollRuns[0] || null;
    const payrollBreakdown = await payrollService.calculateEmployeePayroll(employee, {
      attendanceRecords: empAttendanceLogs,
      approvedLeaves: leaveRequests,
    });
    const latestPayslip = {
      payslipId: `PS-${targetEmpId}-${todayIso.slice(0, 7).replace("-", "")}`,
      employeeId: employee.id,
      employeeName: employee.name,
      jobTitle: employee.jobTitle,
      department: employee.department,
      period: latestRun?.period || `${todayIso.slice(0, 7)}-01 to ${todayIso.slice(0, 7)}-30`,
      payDate: latestRun?.payDate || todayIso,
      status: latestRun?.status || "Active Calculation",
      ...payrollBreakdown,
    };

    const upcomingHolidays = (config?.holidays || [])
      .filter((h) => h.date >= todayIso)
      .slice(0, 4);

    // Company Announcements + Dynamic Holiday Alerts
    const holidayNotice = upcomingHolidays.length
      ? `${upcomingHolidays.map((h) => `${h.name} (${h.date})`).join(" • ")}`
      : "No upcoming public holidays scheduled this month.";

    const announcements = [
      {
        id: "ANN-101",
        title: `Active Shift & Policy Notice: ${assignedShift.name}`,
        date: `Effective ${config?.effectiveFrom || "2026-01-01"}`,
        time: `${assignedShift.effectiveStartTime} – ${assignedShift.effectiveEndTime}`,
        author: "HCM Policy Engine",
        category: "Shift Policy",
        badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        summary: `Your assigned shift starts at ${assignedShift.effectiveStartTime} with a ${effectivePolicies.graceMinutes}-minute grace period. Every ${lateThreshold} late check-ins incur a ${config?.latePolicy?.frequencyPenaltyDays ?? 0.5}-day deduction.`,
        isUrgent: false,
      },
      {
        id: "ANN-102",
        title: "Configured Company Public Holidays",
        date: `${upcomingHolidays[0]?.date || "2026"}`,
        time: "All Day (Paid)",
        author: "People Operations Team",
        category: "Holiday Alert",
        badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        summary: holidayNotice,
        isUrgent: false,
      },
      {
        id: "ANN-103",
        title: "Self-Service Corrections & Overtime Claims Open",
        date: `Within ${config?.attendanceRule?.correctionWindowDays ?? 7} days`,
        time: "Portal Active",
        author: "HR Operations",
        category: "Action Available",
        badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        summary: `Missed a biometric punch or worked WFH / On-Duty? Submit an Attendance Correction within ${config?.attendanceRule?.correctionWindowDays ?? 7} days for HR approval prior to monthly payroll lock.`,
        isUrgent: true,
      },
    ];

    const leaveTypes = config?.leavePolicy?.leaveTypes || [];
    const leaveQuotas = {
      annual: leaveTypes.find((t) => t.code === "Annual")?.quota ?? 14,
      sick: leaveTypes.find((t) => t.code === "Sick")?.quota ?? 8,
      casual: leaveTypes.find((t) => t.code === "Casual")?.quota ?? 10,
    };

    const result = {
      balances,
      leaveRequests,
      todayPunch,
      weeklyHours,
      latesThisMonth,
      lateThreshold,
      calendarDays,
      latestPayslip,
      announcements,
      employee,
      assignedShift,
      effectivePolicies,
      upcomingHolidays,
      leaveQuotas,
      myCorrections,
      config,
    };
    reportCache.set(cacheKey, { data: result, time: Date.now() });
    return result;
  },
};
