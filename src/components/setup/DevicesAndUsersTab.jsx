"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Plus,
  RefreshCw,
  Clock,
  Power,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Users,
  Download,
  Upload,
  Link2,
  UserPlus,
} from "lucide-react";
import { hcmConfigService } from "@/services/hcmConfigService";
import { employeeService } from "@/services/employeeService";
import { useNotification } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";

export function DevicesSetupTab({ config, onConfigUpdated, actorName = "Sarah Connor" }) {
  const { notifySuccess, notifyError, notifyInfo } = useNotification();
  const [devices, setDevices] = useState(config?.devices || []);
  const [busyDeviceId, setBusyDeviceId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const [form, setForm] = useState({
    name: "",
    serialNumber: "",
    brandModel: "ZKTeco SpeedFace-V5L",
    type: "Face + Fingerprint",
    connectionMode: "ADMS Cloud Push",
    ipAddress: "192.168.10.210",
    branch: "San Francisco (HQ)",
    direction: "BOTH",
    timeZone: "America/Los_Angeles",
    autoPullMinutes: 15,
    offlineAlert: true,
    timeDriftAlert: true,
  });

  useEffect(() => {
    setDevices(config?.devices || []);
  }, [config]);

  const openNewModal = () => {
    setEditingDevice(null);
    setForm({
      name: "",
      serialNumber: "",
      brandModel: "ZKTeco SpeedFace-V5L",
      type: "Face + Fingerprint",
      connectionMode: "ADMS Cloud Push",
      ipAddress: "192.168.10.210",
      branch: "San Francisco (HQ)",
      direction: "BOTH",
      timeZone: "America/Los_Angeles",
      autoPullMinutes: 15,
      offlineAlert: true,
      timeDriftAlert: true,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (dev) => {
    setEditingDevice(dev);
    setForm({ ...dev });
    setIsAddModalOpen(true);
  };

  const handleSaveDevice = async (e) => {
    e.preventDefault();
    try {
      const updated = await hcmConfigService.saveDevice(
        {
          ...(editingDevice || {}),
          ...form,
          autoPullMinutes: Number(form.autoPullMinutes || 15),
        },
        actorName
      );
      onConfigUpdated?.(updated);
      setIsAddModalOpen(false);
      notifySuccess(
        editingDevice ? "Device Updated" : "Biometric Device Registered",
        `${form.name} (${form.serialNumber}) saved.`
      );
    } catch (err) {
      notifyError("Device Save Failed", err.message);
    }
  };

  const handleDeviceAction = async (deviceId, actionType) => {
    setBusyDeviceId(`${deviceId}_${actionType}`);
    try {
      const res = await hcmConfigService.runDeviceAction(deviceId, actionType, actorName);
      const fresh = await hcmConfigService.getConfig(true);
      onConfigUpdated?.(fresh);
      notifySuccess("Device Command Executed", res.message);
    } catch (err) {
      notifyError("Device Action Failed", err.message);
    } finally {
      setBusyDeviceId(null);
    }
  };

  const handleDeleteDevice = async (dev) => {
    if (!confirm(`Remove biometric terminal "${dev.name}" (${dev.serialNumber})?`)) return;
    try {
      const updated = await hcmConfigService.deleteDevice(dev.id, actorName);
      onConfigUpdated?.(updated);
      notifyInfo("Device Removed", `${dev.name} removed from active registry.`);
    } catch (err) {
      notifyError("Delete Failed", err.message);
    }
  };

  const onlineCount = devices.filter((d) => d.status === "Online" && d.enabled).length;
  const offlineCount = devices.filter((d) => d.status !== "Online" || !d.enabled).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="text-[11px] text-zinc-400">Total Terminals</div>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">{devices.length}</div>
        </div>
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
          <div className="text-[11px] text-emerald-400">Online & Heartbeat OK</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{onlineCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10">
          <div className="text-[11px] text-amber-400">Offline / Alerts</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{offlineCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10">
          <div className="text-[11px] text-indigo-400">Total Buffered Punches</div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
            {devices.reduce((s, d) => s + Number(d.logsCount || 0), 0)}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Tab 01 — Biometric & Attendance Devices
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Register ZKTeco, Hikvision, or Cloud Push terminals with branch mapping, direction (IN/OUT/BOTH), and sync diagnostics.
            </p>
          </div>
          <Button size="sm" icon={Plus} onClick={openNewModal}>
            Register Device
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Terminal & Serial</TableHead>
                  <TableHead>Mode / Endpoint</TableHead>
                  <TableHead>Branch & Direction</TableHead>
                  <TableHead>Health & Sync</TableHead>
                  <TableHead className="text-right">Diagnostics & Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((dev) => (
                  <TableRow key={dev.id}>
                    <TableCell>
                      <div className="font-semibold text-zinc-100">{dev.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {dev.serialNumber} • {dev.brandModel}
                      </div>
                      <div className="text-[10px] text-zinc-500">{dev.type}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-zinc-200">{dev.connectionMode}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {dev.ipAddress || "Cloud Endpoint"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-zinc-200">{dev.branch}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="info" size="sm">{dev.direction}</Badge>
                        <span className="text-[10px] text-zinc-500 font-mono">{dev.timeZone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={!dev.enabled ? "neutral" : dev.status === "Online" ? "success" : "danger"}
                          dot
                          size="sm"
                        >
                          {!dev.enabled ? "Disabled" : dev.status}
                        </Badge>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {dev.logsCount || 0} logs
                        </span>
                      </div>
                      {dev.lastError ? (
                        <div className="text-[10px] text-rose-400 mt-1 max-w-[200px] truncate" title={dev.lastError}>
                          {dev.lastError}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-500 mt-1">
                          Storage {dev.storageUsedPct || 10}% • Auto-pull {dev.autoPullMinutes || 15}m
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={dev.status === "Online" ? Wifi : WifiOff}
                          isLoading={busyDeviceId === `${dev.id}_test`}
                          onClick={() => handleDeviceAction(dev.id, "test")}
                        >
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Clock}
                          isLoading={busyDeviceId === `${dev.id}_sync_time`}
                          onClick={() => handleDeviceAction(dev.id, "sync_time")}
                        >
                          Sync Time
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={RefreshCw}
                          isLoading={busyDeviceId === `${dev.id}_pull_logs`}
                          onClick={() => handleDeviceAction(dev.id, "pull_logs")}
                        >
                          Pull Logs
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDeviceAction(dev.id, "toggle")}
                          title={dev.enabled ? "Disable Device" : "Enable Device"}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(dev)}
                          title="Edit Device"
                          className="px-2 py-1 rounded-lg text-[11px] text-zinc-300 hover:text-indigo-400 hover:bg-zinc-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDevice(dev)}
                          title="Delete Device"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingDevice ? "Edit Biometric Terminal" : "Register New Biometric Device"}
        description="Every hardware terminal requires a unique Serial Number to prevent duplicate attendance logs."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveDevice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Device Name"
              placeholder="e.g. Gate A - Reception"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Serial Number (Unique)"
              placeholder="e.g. ZK-SF-2026-099"
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Brand / Model"
              value={form.brandModel}
              onChange={(e) => setForm({ ...form, brandModel: e.target.value })}
              required
            />
            <Select
              label="Biometric Type"
              options={["Face + Fingerprint", "Face + RFID Card", "Biometric + PIN", "Mobile Geofence"]}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Connection Mode"
              options={["ADMS Cloud Push", "LAN IP / ADMS Push", "Cloud Push SDK", "API Webhook"]}
              value={form.connectionMode}
              onChange={(e) => setForm({ ...form, connectionMode: e.target.value })}
            />
            <Input
              label="LAN IP / Endpoint"
              value={form.ipAddress}
              onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Branch / Office"
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              required
            />
            <Select
              label="Punch Direction"
              options={["BOTH", "IN", "OUT"]}
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
            />
            <Input
              label="Auto-Pull (mins)"
              type="number"
              min="1"
              max="240"
              value={form.autoPullMinutes}
              onChange={(e) => setForm({ ...form, autoPullMinutes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingDevice ? "Save Device" : "Register Terminal"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function EmployeesOnDeviceTab({ config, onConfigUpdated, actorName = "Aaliyah Patel" }) {
  const { notifySuccess, notifyError } = useNotification();
  const [pulledUsers, setPulledUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mappingModalUser, setMappingModalUser] = useState(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState("");

  const loadPool = async (devId = selectedDeviceId) => {
    setLoading(true);
    try {
      const [pool, emps] = await Promise.all([
        hcmConfigService.pullUsersFromDevices(devId ? [devId] : []),
        employeeService.getAllEmployees(),
      ]);
      setPulledUsers(pool);
      setEmployees(emps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPool();
  }, [config]);

  const handlePull = async () => {
    await loadPool(selectedDeviceId);
    notifySuccess("Device Pull Complete", `Synced ${pulledUsers.length} biometric user records.`);
  };

  const handlePush = async () => {
    setLoading(true);
    try {
      const res = await hcmConfigService.pushEmployeesToDevices(actorName);
      const fresh = await hcmConfigService.getConfig(true);
      onConfigUpdated?.(fresh);
      await loadPool();
      notifySuccess("Directory Pushed to Devices", `${res.total} employees synced (${res.pushed} newly enrolled).`);
    } catch (err) {
      notifyError("Push Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMapping = async (e) => {
    e.preventDefault();
    if (!targetEmployeeId || !mappingModalUser) return;
    try {
      await hcmConfigService.mapDeviceUserToEmployee({
        deviceUserId: mappingModalUser.deviceUserId,
        employeeId: targetEmployeeId,
        actor: actorName,
      });
      setMappingModalUser(null);
      await loadPool();
      notifySuccess(
        "Biometric User Mapped",
        `Device ID #${mappingModalUser.deviceUserId} linked to ${targetEmployeeId}.`
      );
    } catch (err) {
      notifyError("Mapping Failed", err.message);
    }
  };

  const handleQuickOnboard = async (devUser) => {
    const parts = (devUser.name || "New User").trim().split(/\s+/);
    const firstName = parts[0] || "New";
    const lastName = parts.slice(1).join(" ") || "Staff";
    try {
      const created = await employeeService.createEmployee({
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${devUser.deviceUserId}@hcmlite.internal`,
        jobTitle: "Operations Specialist",
        department: "Engineering",
        deviceUserId: String(devUser.deviceUserId),
        assignedShiftId: config?.shifts?.[0]?.id || "SHF-GEN",
        branch: "San Francisco (HQ)",
      });
      await loadPool();
      notifySuccess(
        "Employee Created & Linked",
        `${created.name} (${created.id}) onboarded with Biometric ID #${devUser.deviceUserId}.`
      );
    } catch (err) {
      notifyError("Onboarding Failed", err.message);
    }
  };

  const newCount = pulledUsers.filter((u) => u.pullStatus === "New").length;
  const mismatchCount = pulledUsers.filter(
    (u) => u.pullStatus === "Name Mismatch" || u.pullStatus === "Duplicate ID"
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Tab 02 — Employees on Device (Pull, Match & Map)
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Pull enrolled templates from terminals, resolve unmapped or mismatched biometric User IDs, and push HR updates back.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                loadPool(e.target.value);
              }}
              aria-label="Filter by biometric device"
              className="rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Registered Devices</option>
              {(config?.devices || []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" icon={Download} isLoading={loading} onClick={handlePull}>
              Pull Users from Device
            </Button>
            <Button size="sm" variant="secondary" icon={Upload} isLoading={loading} onClick={handlePush}>
              Push Directory to Devices
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <Badge variant="success">{pulledUsers.filter((u) => u.pullStatus === "Already Mapped").length} Already Mapped</Badge>
            <Badge variant="info">{newCount} New Unmapped</Badge>
            {mismatchCount > 0 && <Badge variant="warning">{mismatchCount} Warnings (Mismatch / Duplicate)</Badge>}
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID & Terminal</TableHead>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead>Match Status</TableHead>
                  <TableHead>Linked HR Employee</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pulledUsers.map((du) => (
                  <TableRow key={`${du.deviceId}_${du.deviceUserId}`}>
                    <TableCell>
                      <div className="font-mono font-bold text-zinc-100">#{du.deviceUserId}</div>
                      <div className="text-[10px] text-zinc-500">{du.deviceId} • {du.privilege}</div>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-200">{du.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {du.hasFace && <Badge variant="info" size="sm">Face</Badge>}
                        {du.hasFinger && <Badge variant="purple" size="sm">Finger</Badge>}
                        {du.cardNo && <Badge variant="neutral" size="sm">{du.cardNo}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          du.pullStatus === "Already Mapped"
                            ? "success"
                            : du.pullStatus === "New"
                            ? "info"
                            : "warning"
                        }
                        dot
                        size="sm"
                      >
                        {du.pullStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {du.mappedEmployeeName ? (
                        <div>
                          <div className="text-xs font-semibold text-zinc-100">{du.mappedEmployeeName}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">{du.mappedEmployeeId}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 italic">Not linked yet</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Link2}
                          onClick={() => {
                            setMappingModalUser(du);
                            setTargetEmployeeId(du.mappedEmployeeId || employees[0]?.id || "");
                          }}
                        >
                          {du.mappedEmployeeId ? "Re-Map" : "Link Employee"}
                        </Button>
                        {du.pullStatus === "New" && (
                          <Button
                            size="sm"
                            icon={UserPlus}
                            onClick={() => handleQuickOnboard(du)}
                          >
                            Import & Onboard
                          </Button>
                        )}
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
        isOpen={Boolean(mappingModalUser)}
        onClose={() => setMappingModalUser(null)}
        title="Link Biometric ID to HR Employee"
        description={
          mappingModalUser
            ? `Associate Device User #${mappingModalUser.deviceUserId} (${mappingModalUser.name}) with an employee profile.`
            : ""
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmMapping} className="space-y-4">
          <Select
            label="Select HR Employee Record"
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.name} (${e.id}) — ${e.department}`,
            }))}
            value={targetEmployeeId}
            onChange={(e) => setTargetEmployeeId(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setMappingModalUser(null)}>
              Cancel
            </Button>
            <Button type="submit">Confirm Biometric Link</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
