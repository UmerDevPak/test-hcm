"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { containerStagger, itemFadeUp } from "@/lib/animationVariants";
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
  LayoutGrid,
  List,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Crown,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Maximize2,
  Minimize2,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { employeeService } from "@/services/employeeService";
import { formatCurrency, formatDate, exportToCSV, cn } from "@/lib/utils";
import { DEPARTMENTS, EMPLOYEE_STATUS, ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmployeeModal } from "@/components/employees/EmployeeModal";
import { RankBadge } from "@/components/performance/RankBadge";
import { PromotionRecommendationModal } from "@/components/performance/PromotionRecommendationModal";
import { ExecutiveRankModal } from "@/components/performance/ExecutiveRankModal";

export default function EmployeesPage() {
  const { user, isHR, isAdmin } = useAuth();
  const canManage = isHR || isAdmin;
  const { notifySuccess, notifyError } = useNotification();

  const [employees, setEmployees] = useState(
    () => employeeService.peekCachedEmployees() || []
  );
  const [loading, setLoading] = useState(
    () => !employeeService.peekCachedEmployees()
  );
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRank, setSelectedRank] = useState("");
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [hrPromoteEmployee, setHrPromoteEmployee] = useState(null);
  const [adminPromoteEmployee, setAdminPromoteEmployee] = useState(null);

  // Table horizontal and vertical scrolling refs and states
  const tableScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalEmployees = employees.length;
  const isAll = pageSize === "all";
  const effectivePageSize = isAll ? Math.max(1, totalEmployees) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalEmployees / effectivePageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = isAll ? 0 : (validCurrentPage - 1) * effectivePageSize;
  const endIndex = isAll ? totalEmployees : Math.min(startIndex + effectivePageSize, totalEmployees);
  const displayedEmployees = employees.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDept, selectedStatus, selectedRank]);

  const checkTableScroll = () => {
    if (!tableScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth, scrollTop, scrollHeight, clientHeight } =
      tableScrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
    setCanScrollUp(scrollTop > 10);
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
  };

  useEffect(() => {
    checkTableScroll();
    const el = tableScrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkTableScroll, { passive: true });
      window.addEventListener("resize", checkTableScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkTableScroll);
      window.removeEventListener("resize", checkTableScroll);
    };
  }, [displayedEmployees, viewMode, isCompactViewport]);

  const handleScrollHorizontal = (delta) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  const handleScrollToTop = () => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await employeeService.getAllEmployees({
        search,
        department: selectedDept,
        status: selectedStatus,
        ranking: selectedRank,
      });
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDept, selectedStatus, selectedRank]);

  useEffect(() => {
    const handleUpdate = () => fetchEmployees();
    window.addEventListener("hcm_promotion_updated", handleUpdate);
    window.addEventListener("hcm_config_updated", handleUpdate);
    return () => {
      window.removeEventListener("hcm_promotion_updated", handleUpdate);
      window.removeEventListener("hcm_config_updated", handleUpdate);
    };
  }, [search, selectedDept, selectedStatus, selectedRank]);

  const handleDelete = async (id, name) => {
    if (confirm(`Are you sure you want to offboard/delete ${name}?`)) {
      // 1. Instant optimistic UI feedback (0ms)
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      notifySuccess("Employee removed", `${name} record deleted.`);

      try {
        await employeeService.deleteEmployee(id);
      } catch (err) {
        notifyError("Error deleting employee", err.message);
        fetchEmployees();
      }
    }
  };

  const handleExport = () => {
    exportToCSV(
      `hcm-lite-workforce-${new Date().toISOString().split("T")[0]}`,
      employees,
      {
        id: "Employee ID",
        name: "Full Name",
        email: "Email Address",
        jobTitle: "Job Title",
        department: "Department",
        status: "Status",
        annualSalary: "Annual Compensation ($)",
        hireDate: "Hire Date",
      }
    );
    notifySuccess("Export ready", "Workforce directory CSV downloaded.");
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerStagger}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemFadeUp}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Workforce Directory
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage personnel records, departments, compensation tiers, and access credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          {canManage && (
            <Button
              size="sm"
              icon={Plus}
              onClick={() => {
                setEditingEmployee(null);
                setIsModalOpen(true);
              }}
            >
              Add Employee
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filter and Search Bar */}
      <motion.div
        variants={itemFadeUp}
        className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
      >
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search by name, email, or role..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              placeholder="All Departments"
              options={DEPARTMENTS}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-40">
            <Select
              placeholder="All Statuses"
              options={Object.values(EMPLOYEE_STATUS)}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              placeholder="All Ranks"
              options={[
                { value: "", label: "All Ranks" },
                { value: "Rank A", label: "Rank A · Top (90%+)" },
                { value: "Rank B", label: "Rank B · Core (75%-89%)" },
                { value: "Rank C", label: "Rank C · Developing (<75%)" },
              ]}
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value)}
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 bg-zinc-100 dark:bg-zinc-900 self-end md:self-auto">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md ${
              viewMode === "table"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md ${
              viewMode === "grid"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Main Content: Table or Grid */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Try adjusting your search criteria or add a new team member."
          actionLabel={canManage ? "Add Employee" : null}
          onAction={() => {
            setEditingEmployee(null);
            setIsModalOpen(true);
          }}
        />
      ) : viewMode === "table" ? (
        <motion.div
          variants={itemFadeUp}
          className="relative group/table rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden"
        >
          {/* Floating Left Scroll Button */}
          {/* Table Header Controls Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-zinc-50/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2 font-mono">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Showing <strong className="text-zinc-800 dark:text-zinc-200">{totalEmployees === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">{totalEmployees}</strong> personnel records
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Left / Right Table Scroll Buttons */}
              <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-300/50 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => handleScrollHorizontal(-260)}
                  disabled={!canScrollLeft}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Scroll Table Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Left</span>
                </button>
                <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-700" />
                <button
                  type="button"
                  onClick={() => handleScrollHorizontal(260)}
                  disabled={!canScrollRight}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Scroll Table Right"
                >
                  <span>Right</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewport Height Toggle */}
              <button
                type="button"
                onClick={() => setIsCompactViewport((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                title={isCompactViewport ? "Switch to Full Height" : "Switch to Compact Viewport"}
              >
                {isCompactViewport ? (
                  <>
                    <Maximize2 className="w-3 h-3 text-indigo-400" />
                    <span>Full Height</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3 h-3 text-indigo-400" />
                    <span>Compact Scroll</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table Element */}
          <Table
            containerRef={tableScrollRef}
            containerClassName={cn(
              "border-0 rounded-none overflow-x-auto scrollbar-thin transition-all",
              isCompactViewport ? "max-h-[580px] overflow-y-auto" : "max-h-none overflow-y-visible"
            )}
          >
            <TableHeader className="sticky top-0 z-30 bg-zinc-100/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
              <TableRow>
                <TableHead className="sticky left-0 z-40 bg-zinc-100 dark:bg-zinc-900 min-w-[240px] border-r border-zinc-200 dark:border-zinc-800 shadow-[2px_0_6px_-1px_rgba(0,0,0,0.18)]">
                  Employee
                </TableHead>
                <TableHead className="min-w-[190px]">Department & Role</TableHead>
                <TableHead className="min-w-[180px]">Performance Rank</TableHead>
                <TableHead className="min-w-[130px]">Status</TableHead>
                <TableHead className="min-w-[170px]">Location</TableHead>
                <TableHead className="min-w-[130px]">Hire Date</TableHead>
                <TableHead className="min-w-[140px]">Annual Salary</TableHead>
                <TableHead className="sticky right-0 z-40 bg-zinc-100 dark:bg-zinc-900 min-w-[140px] text-right border-l border-zinc-200 dark:border-zinc-800 shadow-[-2px_0_6px_-1px_rgba(0,0,0,0.18)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedEmployees.map((emp) => (
                <TableRow key={emp.id} className="group">
                  <TableCell className="sticky left-0 z-20 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/80 min-w-[240px] border-r border-zinc-200 dark:border-zinc-800 shadow-[2px_0_6px_-1px_rgba(0,0,0,0.18)] transition-colors">
                    <Link
                      href={`/employees/${emp.id}`}
                      className="flex items-center gap-3 group/link"
                    >
                      <Avatar src={emp.avatar} name={emp.name} size="sm" />
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover/link:text-indigo-400 transition-colors">
                          {emp.name}
                        </div>
                        <div className="text-[11px] text-zinc-400">{emp.email}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-zinc-800 dark:text-zinc-200">
                      {emp.jobTitle}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {emp.department} • {ROLE_LABELS[emp.role] || emp.role}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <RankBadge rank={emp.ranking} size="sm" />
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Work: {emp.workScore ?? 85}% • Conduct: {emp.behaviorScore ?? 85}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        emp.status === "Active"
                          ? "success"
                          : emp.status === "On Leave"
                          ? "warning"
                          : "neutral"
                      }
                      dot
                    >
                      {emp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500 dark:text-zinc-400">
                    {emp.location || "San Francisco, CA"}
                  </TableCell>
                  <TableCell className="text-zinc-500 dark:text-zinc-400">
                    {formatDate(emp.hireDate)}
                  </TableCell>
                  <TableCell className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(emp.annualSalary)}
                  </TableCell>
                  <TableCell className="sticky right-0 z-20 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/80 min-w-[140px] text-right border-l border-zinc-200 dark:border-zinc-800 shadow-[-2px_0_6px_-1px_rgba(0,0,0,0.18)] transition-colors">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/employees/${emp.id}`}>
                        <button
                          title="View 360 Profile"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      {isHR && (
                        <button
                          title="Recommend Promotion to Admin"
                          onClick={() => setHrPromoteEmployee(emp)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          title="Executive Rank Promotion"
                          onClick={() => setAdminPromoteEmployee(emp)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canManage && (
                        <>
                          <button
                            title="Edit Personnel Record"
                            onClick={() => {
                              setEditingEmployee(emp);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete / Offboard"
                            onClick={() => handleDelete(emp.id, emp.name)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Floating Back-to-Top Button */}
          {canScrollUp && isCompactViewport && (
            <button
              type="button"
              onClick={handleScrollToTop}
              className="absolute bottom-16 right-6 z-30 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20 border border-indigo-400/30 backdrop-blur transition-all animate-in fade-in zoom-in-95"
            >
              <ChevronUp className="w-4 h-4" />
              <span>Back to Top</span>
            </button>
          )}

          {/* Pagination Toolbar for Table View */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-zinc-50/80 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Showing <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{totalEmployees === 0 ? 0 : startIndex + 1}</strong>–
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{endIndex}</strong> of{" "}
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{totalEmployees}</strong> employees
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Per page:</span>
                {[10, 25, 50, "all"].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      pageSize === size
                        ? "bg-indigo-600 text-white font-bold shadow-xs"
                        : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {size === "all" ? "All" : size}
                  </button>
                ))}
              </div>
            </div>

            {!isAll && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage === 1}
                  className="p-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Prev</span>
                </button>
                <span className="px-2 py-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-200 font-medium">
                  Page {validCurrentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline text-[11px]">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage === totalPages}
                  className="p-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        /* Grid View */
        <div className="space-y-4">
          <motion.div
            variants={containerStagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
          >
            {displayedEmployees.map((emp) => (
              <motion.div
                key={emp.id}
                variants={itemFadeUp}
                whileHover={{ y: -3, transition: { duration: 0.16 } }}
                className="h-full"
              >
                <Card className="p-5 flex flex-col justify-between h-full min-h-[220px]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={emp.avatar} name={emp.name} size="md" />
                      <div>
                        <Link
                          href={`/employees/${emp.id}`}
                          className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-400 transition-colors"
                        >
                          {emp.name}
                        </Link>
                        <p className="text-xs text-zinc-400">{emp.jobTitle}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge
                        variant={emp.status === "Active" ? "success" : "warning"}
                        dot
                      >
                        {emp.status}
                      </Badge>
                      <RankBadge rank={emp.ranking} size="xs" />
                    </div>
                  </div>

                  <div className="my-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5 text-xs text-zinc-400">
                    <div className="flex justify-between items-center">
                      <span>Performance Tier</span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-200">
                        <span>Work {emp.workScore ?? 85}%</span>
                        <span>•</span>
                        <span>Conduct {emp.behaviorScore ?? 85}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Department</span>
                      <span className="font-medium text-zinc-200">{emp.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compensation</span>
                      <span className="font-mono font-medium text-zinc-200">
                        {formatCurrency(emp.annualSalary)}/yr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email</span>
                      <span className="text-zinc-300 truncate max-w-[180px]">{emp.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-auto border-t border-zinc-100 dark:border-zinc-800/60">
                    <span className="text-[11px] text-zinc-500 font-mono">{emp.id}</span>
                    <div className="flex items-center gap-1">
                      {isHR && (
                        <button
                          title="Recommend Promotion to Admin"
                          onClick={() => setHrPromoteEmployee(emp)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          title="Executive Rank Promotion"
                          onClick={() => setAdminPromoteEmployee(emp)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Link href={`/employees/${emp.id}`}>
                        <Button variant="ghost" size="sm" icon={ExternalLink}>
                          360 Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination Toolbar for Grid View */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Showing <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{totalEmployees === 0 ? 0 : startIndex + 1}</strong>–
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{endIndex}</strong> of{" "}
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{totalEmployees}</strong> employees
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Per page:</span>
                {[10, 25, 50, "all"].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      pageSize === size
                        ? "bg-indigo-600 text-white font-bold shadow-xs"
                        : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {size === "all" ? "All" : size}
                  </button>
                ))}
              </div>
            </div>

            {!isAll && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage === 1}
                  className="p-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Prev</span>
                </button>
                <span className="px-2 py-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-200 font-medium">
                  Page {validCurrentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="flex items-center gap-1 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline text-[11px]">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage === totalPages}
                  className="p-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employee={editingEmployee}
        onSaved={fetchEmployees}
      />

      <PromotionRecommendationModal
        isOpen={Boolean(hrPromoteEmployee)}
        onClose={() => setHrPromoteEmployee(null)}
        employee={hrPromoteEmployee}
        onSubmitted={fetchEmployees}
      />

      <ExecutiveRankModal
        isOpen={Boolean(adminPromoteEmployee)}
        onClose={() => setAdminPromoteEmployee(null)}
        employee={adminPromoteEmployee}
        onPromoted={fetchEmployees}
      />
    </motion.div>
  );
}
