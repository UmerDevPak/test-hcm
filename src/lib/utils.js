import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = "USD", decimals = 2) {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(amount));
}

export function formatCompactCurrency(amount, currency = "USD") {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(Number(num)));
}

export function formatPercent(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return "0.00%";
  return `${Number(val).toFixed(decimals)}%`;
}

export function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTime(dateInput = new Date()) {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput || "—");
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getInitials(name = "") {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function generateId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

export function exportToCSV(filename, rows, headers) {
  if (!rows || !rows.length) return;
  const headerKeys = Object.keys(headers);
  const headerLabels = Object.values(headers);

  const csvContent = [
    headerLabels.join(","),
    ...rows.map((row) =>
      headerKeys
        .map((key) => {
          let val = row[key] ?? "";
          if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function calculateAnnualTaxSlab(annualGross) {
  if (!annualGross || annualGross <= 600000) {
    return 0;
  }
  if (annualGross <= 1200000) {
    return (annualGross - 600000) * 0.05;
  }
  if (annualGross <= 2400000) {
    return 30000 + (annualGross - 1200000) * 0.15;
  }
  if (annualGross <= 3600000) {
    return 210000 + (annualGross - 2400000) * 0.25;
  }
  return 510000 + (annualGross - 3600000) * 0.35;
}

export function calculatePayrollBreakdown({
  basicSalary = 0,
  annualSalary = 0,
  workingDays = 22,
  absentDays = 0,
  unpaidDays = 0,
  halfDays = 0,
  payFrequency = "monthly",
}) {
  let monthlyBasic = 0;
  let monthlyGross = 0;

  if (basicSalary > 0) {
    monthlyBasic = basicSalary;
    monthlyGross = monthlyBasic * 1.5;
  } else if (annualSalary > 0) {
    monthlyGross = annualSalary / 12;
    monthlyBasic = monthlyGross / 1.5;
  } else {
    monthlyBasic = 50000;
    monthlyGross = monthlyBasic * 1.5;
  }

  const hra = monthlyBasic * 0.4;
  const medical = monthlyBasic * 0.1;

  const daysInPeriod = workingDays > 0 ? workingDays : 22;
  const perDayDeduction = monthlyGross / daysInPeriod;

  const penaltyUnits = Number(absentDays || 0) + Number(unpaidDays || 0) + 0.5 * Number(halfDays || 0);
  const attendanceDeduction = penaltyUnits * perDayDeduction;

  const annualizedGross = monthlyGross * 12;
  const annualTax = calculateAnnualTaxSlab(annualizedGross);
  const monthlyTax = annualTax / 12;

  const totalDeductions = attendanceDeduction + monthlyTax;
  const netPay = Math.max(0, monthlyGross - totalDeductions);

  return {
    basicSalary: Number(monthlyBasic.toFixed(2)),
    hra: Number(hra.toFixed(2)),
    medical: Number(medical.toFixed(2)),
    grossSalary: Number(monthlyGross.toFixed(2)),
    totalGross: Number(monthlyGross.toFixed(2)),
    periodGross: Number(monthlyGross.toFixed(2)),
    annualizedGross: Number(annualizedGross.toFixed(2)),
    workingDays: daysInPeriod,
    perDayDeduction: Number(perDayDeduction.toFixed(2)),
    absentDays: Number(absentDays || 0),
    unpaidDays: Number(unpaidDays || 0),
    halfDays: Number(halfDays || 0),
    penaltyUnits: Number(penaltyUnits.toFixed(1)),
    attendanceDeduction: Number(attendanceDeduction.toFixed(2)),
    tax: Number(monthlyTax.toFixed(2)),
    annualTax: Number(annualTax.toFixed(2)),
    totalTaxes: Number(monthlyTax.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    netPay: Number(netPay.toFixed(2)),
  };
}
