"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, Plus, Trash2, Edit2, Sparkles } from "lucide-react";
import { hcmConfigService } from "@/services/hcmConfigService";
import { DEPARTMENTS } from "@/lib/constants";
import { useNotification } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";

export function ShiftsTab({ config, onConfigUpdated, actorName = "Sarah Connor" }) {
  const { notifySuccess, notifyError, notifyInfo } = useNotification();
  const [shifts, setShifts] = useState(config?.shifts || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Fixed",
    startTime: "09:00",
    endTime: "18:00",
    breakMinutes: 60,
    graceMinutesOverride: "",
    shiftAllowance: 0,
    crossesMidnight: false,
    assignedDepartments: [],
  });

  useEffect(() => {
    setShifts(config?.shifts || []);
  }, [config]);

  const openModal = (shift = null) => {
    setEditingShift(shift);
    if (shift) {
      setForm({
        ...shift,
        graceMinutesOverride: shift.graceMinutesOverride ?? "",
        assignedDepartments: shift.assignedDepartments || [],
      });
    } else {
      setForm({
        code: "",
        name: "",
        type: "Fixed",
        startTime: "09:00",
        endTime: "18:00",
        breakMinutes: 60,
        graceMinutesOverride: "",
        shiftAllowance: 0,
        crossesMidnight: false,
        assignedDepartments: [],
      });
    }
    setIsModalOpen(true);
  };

  const toggleDept = (dept) => {
    const curr = form.assignedDepartments || [];
    setForm({
      ...form,
      assignedDepartments: curr.includes(dept) ? curr.filter((d) => d !== dept) : [...curr, dept],
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updated = await hcmConfigService.saveShift(
        {
          ...(editingShift || {}),
          ...form,
          breakMinutes: Number(form.breakMinutes || 60),
          shiftAllowance: Number(form.shiftAllowance || 0),
          graceMinutesOverride:
            form.graceMinutesOverride === "" ? null : Number(form.graceMinutesOverride),
        },
        actorName
      );
      onConfigUpdated?.(updated);
      setIsModalOpen(false);
      notifySuccess("Shift Template Saved", `${form.name} (${form.startTime}–${form.endTime}) active.`);
    } catch (err) {
      notifyError("Shift Save Failed", err.message);
    }
  };

  const handleDelete = async (shift) => {
    if (shifts.length <= 1) {
      notifyError("Cannot Delete", "At least one company shift template must remain active.");
      return;
    }
    if (!confirm(`Delete shift "${shift.name}"?`)) return;
    const updated = await hcmConfigService.deleteShift(shift.id, actorName);
    onConfigUpdated?.(updated);
    notifyInfo("Shift Deleted", `${shift.name} removed.`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Tab 06 — Shifts & Seasonal Timings
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Manage fixed, flexible, rotational, and night-crossing shifts, department mappings, shift allowances, and seasonal overrides.
            </p>
          </div>
          <Button size="sm" icon={Plus} onClick={() => openModal(null)}>
            Add Shift Template
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shifts.map((sh) => (
            <div
              key={sh.id}
              className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {sh.code}
                    </span>
                    <h4 className="font-semibold text-sm text-zinc-100">{sh.name}</h4>
                  </div>
                  <p className="text-xs font-mono text-cyan-400 mt-1">
                    {sh.startTime} – {sh.endTime} {sh.crossesMidnight ? "(+1d Night)" : ""}
                  </p>
                </div>
                <Badge variant={sh.type === "Night" ? "purple" : sh.type === "Flexible" ? "info" : "neutral"} size="sm">
                  {sh.type}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] bg-zinc-950/60 rounded-lg p-2.5 border border-zinc-800/80">
                <div>
                  <span className="text-zinc-500 block">Grace Override</span>
                  <span className="font-mono text-zinc-200">
                    {sh.graceMinutesOverride !== null && sh.graceMinutesOverride !== undefined
                      ? `${sh.graceMinutesOverride} mins`
                      : "Company Default"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Break</span>
                  <span className="font-mono text-zinc-200">{sh.breakMinutes || 60} mins</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Allowance</span>
                  <span className="font-mono text-emerald-400">${sh.shiftAllowance || 0}/mo</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Assigned Departments</div>
                <div className="flex flex-wrap gap-1">
                  {(sh.assignedDepartments || []).length > 0 ? (
                    sh.assignedDepartments.map((d) => (
                      <Badge key={d} variant="neutral" size="sm">{d}</Badge>
                    ))
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic">Individual Assignment Only</span>
                  )}
                </div>
              </div>

              {Array.isArray(sh.seasonalOverrides) && sh.seasonalOverrides.length > 0 && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Seasonal Override: {sh.seasonalOverrides[0].name} ({sh.seasonalOverrides[0].startTime}–{sh.seasonalOverrides[0].endTime})
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
                <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openModal(sh)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-400" icon={Trash2} onClick={() => handleDelete(sh)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingShift ? "Edit Shift Template" : "Create New Shift"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Code"
              placeholder="e.g. GEN"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Shift Name"
                placeholder="e.g. Morning Engineering"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Shift Type"
              options={["Fixed", "Flexible", "Rotational", "Night"]}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <Input
              label="Start Time"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Break (mins)"
              type="number"
              value={form.breakMinutes}
              onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })}
            />
            <Input
              label="Grace Override (mins)"
              type="number"
              placeholder="Default"
              value={form.graceMinutesOverride}
              onChange={(e) => setForm({ ...form, graceMinutesOverride: e.target.value })}
            />
            <Input
              label="Shift Allowance ($/mo)"
              type="number"
              value={form.shiftAllowance}
              onChange={(e) => setForm({ ...form, shiftAllowance: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.crossesMidnight)}
              onChange={(e) => setForm({ ...form, crossesMidnight: e.target.checked })}
              className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
            />
            Shift crosses midnight (Night shift out-time next calendar day)
          </label>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">Auto-Assign Departments</label>
            <div className="flex flex-wrap gap-1.5">
              {DEPARTMENTS.map((d) => {
                const selected = (form.assignedDepartments || []).includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDept(d)}
                    className={`px-2.5 py-1 rounded-md text-[11px] border ${
                      selected
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Shift</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function PublicHolidaysTab({ config, onConfigUpdated, actorName = "Sarah Connor" }) {
  const { notifySuccess, notifyError, notifyInfo } = useNotification();
  const [holidays, setHolidays] = useState(config?.holidays || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [form, setForm] = useState({
    name: "",
    date: "",
    endDate: "",
    type: "National",
    paid: true,
    applyToBranch: "All Branches",
    applyToDepartment: "All",
    overrideWeeklyOff: "None",
    sandwichLinked: true,
  });

  useEffect(() => {
    setHolidays(config?.holidays || []);
  }, [config]);

  const openModal = (hol = null) => {
    setEditingHoliday(hol);
    if (hol) {
      setForm({ ...hol, endDate: hol.endDate || hol.date });
    } else {
      const today = new Date().toISOString().split("T")[0];
      setForm({
        name: "",
        date: today,
        endDate: today,
        type: "National",
        paid: true,
        applyToBranch: "All Branches",
        applyToDepartment: "All",
        overrideWeeklyOff: "None",
        sandwichLinked: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updated = await hcmConfigService.saveHoliday(
        {
          ...(editingHoliday || {}),
          ...form,
          endDate: form.endDate || form.date,
        },
        actorName
      );
      onConfigUpdated?.(updated);
      setIsModalOpen(false);
      notifySuccess("Public Holiday Saved", `${form.name} (${form.date}) added to unified holiday calendar.`);
    } catch (err) {
      notifyError("Save Failed", err.message);
    }
  };

  const handleDelete = async (hol) => {
    if (!confirm(`Remove holiday "${hol.name}"?`)) return;
    const updated = await hcmConfigService.deleteHoliday(hol.id, actorName);
    onConfigUpdated?.(updated);
    notifyInfo("Holiday Removed", `${hol.name} deleted.`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Tab 08 — Public Holidays & Calendar Sync
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Configured holidays are automatically skipped when employees apply for Leave and trigger Holiday OT multipliers if worked.
            </p>
          </div>
          <Button size="sm" icon={Plus} onClick={() => openModal(null)}>
            Add Public Holiday
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Date(s)</TableHead>
                  <TableHead>Type & Pay</TableHead>
                  <TableHead>Applicability Scope</TableHead>
                  <TableHead>Weekly Off / Sandwich</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((hol) => (
                  <TableRow key={hol.id}>
                    <TableCell className="font-semibold text-zinc-100">{hol.name}</TableCell>
                    <TableCell className="font-mono text-xs text-amber-300">
                      {hol.date}
                      {hol.endDate && hol.endDate !== hol.date ? ` → ${hol.endDate}` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="info" size="sm">{hol.type}</Badge>
                        <Badge variant={hol.paid ? "success" : "neutral"} size="sm">
                          {hol.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {hol.applyToBranch || "All Branches"} • {hol.applyToDepartment || "All"}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {hol.overrideWeeklyOff || "None"} {hol.sandwichLinked ? "• Sandwich Linked" : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openModal(hol)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-rose-400" icon={Trash2} onClick={() => handleDelete(hol)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHoliday ? "Edit Public Holiday" : "Add Public Holiday"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Holiday Name"
            placeholder="e.g. Eid-ul-Fitr / Memorial Day"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={["National", "Religious", "Regional", "Company Shutdown"]}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <Select
              label="Applies to Branch"
              options={["All Branches", "San Francisco (HQ)", "New York, NY", "Remote"]}
              value={form.applyToBranch}
              onChange={(e) => setForm({ ...form, applyToBranch: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Applies to Department"
              options={["All", ...DEPARTMENTS]}
              value={form.applyToDepartment}
              onChange={(e) => setForm({ ...form, applyToDepartment: e.target.value })}
            />
            <Select
              label="If Falls on Weekly Off"
              options={["None", "CompensatoryOff", "MondayBridge"]}
              value={form.overrideWeeklyOff}
              onChange={(e) => setForm({ ...form, overrideWeeklyOff: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.paid)}
              onChange={(e) => setForm({ ...form, paid: e.target.checked })}
              className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
            />
            Paid Public Holiday (Does not deduct from salary or leave quota)
          </label>
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Holiday</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
