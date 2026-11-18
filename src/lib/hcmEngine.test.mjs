import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HCM_CONFIG,
  parseTimeToMinutes,
  resolveEmployeeShift,
  evaluateDailyAttendance,
  computeDeviceUserPullStatus,
  evaluateLeaveRequest,
  calculateEmployeeMonthlyPayroll,
  isDuplicatePunchGap,
} from "./hcmEngine.js";

test("parseTimeToMinutes handles 12h AM/PM and 24h strings cleanly", () => {
  assert.equal(parseTimeToMinutes("09:00 AM"), 540);
  assert.equal(parseTimeToMinutes("09:15"), 555);
  assert.equal(parseTimeToMinutes("06:30 PM"), 1110);
  assert.equal(parseTimeToMinutes("12:05 AM"), 5);
  assert.equal(parseTimeToMinutes("invalid"), null);
});

test("resolveEmployeeShift applies seasonal/Ramadan date override cleanly", () => {
  const emp = { id: "EMP-005", department: "Human Resources" };
  const normalShift = resolveEmployeeShift(DEFAULT_HCM_CONFIG, emp, "2026-10-15");
  assert.equal(normalShift.effectiveStartTime, "09:00");
  assert.equal(normalShift.effectiveEndTime, "18:00");

  const seasonalShift = resolveEmployeeShift(DEFAULT_HCM_CONFIG, emp, "2026-03-01");
  assert.equal(seasonalShift.effectiveStartTime, "09:00");
  assert.equal(seasonalShift.effectiveEndTime, "15:30");
  assert.equal(seasonalShift.effectiveGraceMinutes, 20);
  assert.ok(seasonalShift.seasonalApplied);
});

test("evaluateDailyAttendance enforces shift grace, half-day, and working day OT", () => {
  const emp = { id: "EMP-005", department: "Human Resources", employmentType: "Full-Time" };

  // Within 15m grace -> Present
  const onTime = evaluateDailyAttendance({
    config: DEFAULT_HCM_CONFIG,
    employee: emp,
    date: "2026-10-14",
    clockIn: "09:14 AM",
    clockOut: "06:00 PM",
  });
  assert.equal(onTime.status, "Present");
  assert.equal(onTime.isLate, false);

  // After 15m grace (09:25 AM) -> Late 10m after grace
  const lateDay = evaluateDailyAttendance({
    config: DEFAULT_HCM_CONFIG,
    employee: emp,
    date: "2026-10-14",
    clockIn: "09:25 AM",
    clockOut: "08:00 PM", // 2 hrs after shift end -> OT!
  });
  assert.equal(lateDay.status, "Late");
  assert.equal(lateDay.isLate, true);
  assert.equal(lateDay.lateMinutes, 10);
  assert.equal(lateDay.overtimeHours, 2);
  assert.equal(lateDay.overtimeMultiplier, 1.5);

  // Short hours (<5h) -> Half-Day
  const shortDay = evaluateDailyAttendance({
    config: DEFAULT_HCM_CONFIG,
    employee: emp,
    date: "2026-10-14",
    clockIn: "09:00 AM",
    clockOut: "01:00 PM",
  });
  assert.equal(shortDay.status, "Half-Day");
  assert.equal(shortDay.isHalfDay, true);
});

test("evaluateDailyAttendance applies 2.0x multiplier on Public Holiday", () => {
  const emp = { id: "EMP-005", department: "Human Resources", employmentType: "Full-Time" };
  const holidayWork = evaluateDailyAttendance({
    config: DEFAULT_HCM_CONFIG,
    employee: emp,
    date: "2026-07-04", // Independence Day (Saturday or Holiday)
    clockIn: "09:00 AM",
    clockOut: "01:00 PM",
  });
  assert.equal(holidayWork.status, "Holiday Work");
  assert.equal(holidayWork.overtimeMultiplier, 2.0);
  assert.equal(holidayWork.overtimeHours, 4);
});

test("isDuplicatePunchGap filters rapid double taps within configured window", () => {
  const t1 = Date.parse("2026-10-14T09:00:00Z");
  const t2 = Date.parse("2026-10-14T09:02:30Z");
  const t3 = Date.parse("2026-10-14T09:10:00Z");
  assert.equal(isDuplicatePunchGap({ previousTimestampMs: t1, currentTimestampMs: t2, gapMinutes: 5 }), true);
  assert.equal(isDuplicatePunchGap({ previousTimestampMs: t1, currentTimestampMs: t3, gapMinutes: 5 }), false);
});

test("computeDeviceUserPullStatus detects Already Mapped, Name Mismatch, Duplicate ID, and New", () => {
  const employees = [
    { id: "EMP-001", name: "Sarah Connor", deviceUserId: "101" },
    { id: "EMP-008", name: "Jordan Taylor", deviceUserId: "108" },
    { id: "EMP-002", name: "Marcus Vance", deviceUserId: "102" },
    { id: "EMP-099", name: "Marcus Clone", deviceUserId: "102" },
  ];
  assert.equal(computeDeviceUserPullStatus({ deviceUserId: "101", name: "Sarah Connor", enabled: true }, employees), "Already Mapped");
  assert.equal(computeDeviceUserPullStatus({ deviceUserId: "108", name: "J. Taylor", enabled: true }, employees), "Name Mismatch");
  assert.equal(computeDeviceUserPullStatus({ deviceUserId: "102", name: "Marcus Vance", enabled: true }, employees), "Duplicate ID");
  assert.equal(computeDeviceUserPullStatus({ deviceUserId: "109", name: "Omar Farooq", enabled: true }, employees), "New");
});

test("evaluateLeaveRequest skips weekends/holidays, blocks blackout dates, and enforces sandwich rule", () => {
  const emp = { id: "EMP-003", employeeType: "Full-Time" };
  // Thanksgiving is 2026-11-26 (Thu) & 2026-11-27 (Fri). Range Mon Nov 23..Fri Nov 27 = 3 working days + 2 holidays
  const res = evaluateLeaveRequest({
    config: DEFAULT_HCM_CONFIG,
    employee: emp,
    leaveType: "Annual",
    startDate: "2026-11-23",
    endDate: "2026-11-27",
    balances: { annual: 10, sick: 8, casual: 8 },
    existingRequests: [],
    asOfDate: "2026-11-01",
  });
  assert.equal(res.valid, true);
  assert.equal(res.workingDays, 3);
  assert.equal(res.skippedHolidays, 2);

  // Blackout date blocked
  const blackout = evaluateLeaveRequest({
    config: DEFAULT_HCM_CONFIG,
    employee: emp,
    leaveType: "Annual",
    startDate: "2026-12-30",
    endDate: "2026-12-31",
    balances: { annual: 10 },
    existingRequests: [],
    asOfDate: "2026-11-01",
  });
  assert.equal(blackout.valid, false);
  assert.ok(blackout.errors.some((e) => e.toLowerCase().includes("blackout")));

  // Sandwich rule enabled on Fri + Sat + Sun + Mon
  const sandwichCfg = {
    ...DEFAULT_HCM_CONFIG,
    leavePolicy: { ...DEFAULT_HCM_CONFIG.leavePolicy, sandwichRuleApplied: true },
  };
  const sandwich = evaluateLeaveRequest({
    config: sandwichCfg,
    employee: emp,
    leaveType: "Annual",
    startDate: "2026-10-16", // Friday
    endDate: "2026-10-19",   // Monday
    balances: { annual: 10 },
    existingRequests: [],
    asOfDate: "2026-10-01",
  });
  assert.equal(sandwich.workingDays, 2);
  assert.equal(sandwich.sandwichDaysAdded, 2);
  assert.equal(sandwich.chargeableDays, 4);
});

test("calculateEmployeeMonthlyPayroll honors Tab 10 calculationMethod, Late Frequency Penalty, and OT Pay", () => {
  const emp = { id: "EMP-003", annualSalary: 120000, department: "Engineering" };
  const att = [
    { employeeId: "EMP-003", status: "Late", isLate: true, lateMinutes: 10, overtimeHours: 2, overtimeMultiplier: 1.5 },
    { employeeId: "EMP-003", status: "Late", isLate: true, lateMinutes: 15 },
    { employeeId: "EMP-003", status: "Late", isLate: true, lateMinutes: 20 },
  ];

  // With Fixed 30 Days method
  const cfgFixed30 = {
    ...DEFAULT_HCM_CONFIG,
    salarySetup: { ...DEFAULT_HCM_CONFIG.salarySetup, calculationMethod: "Fixed30" },
  };
  const breakdown = calculateEmployeeMonthlyPayroll({
    config: cfgFixed30,
    employee: emp,
    attendanceRecords: att,
    approvedLeaves: [],
  });

  assert.equal(breakdown.workingDays, 30);
  assert.equal(breakdown.lateCount, 3);
  assert.equal(breakdown.latePenaltyDays, 0.5); // 3 lates = 0.5 day penalty
  assert.equal(breakdown.overtimeHours, 2);
  assert.ok(breakdown.overtimePay > 0);
  assert.ok(breakdown.attendanceDeduction > 0);
});
