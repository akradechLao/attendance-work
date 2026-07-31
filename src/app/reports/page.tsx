"use client";

import { useState, useEffect } from "react";
import {
  getAttendanceStats,
  getEmployeeAttendanceHistory,
  getOtSummary,
} from "@/lib/actions";
import { LEAVE_TYPES } from "@/lib/leave-constants";

interface EmployeeStats {
  empId: number;
  name: string;
  groupType: string;
  totalDays: number;
  lateDays: number;
  onTimeDays: number;
  absentDays: number;
  leaveDays: number;
  leaveDetails: Record<string, number>;
  wfhDays: number;
  totalWorkHours: number;
  avgCheckIn: string;
}

interface DailyRecord {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number | null;
}

interface OtSummaryItem {
  empId: number;
  name: string;
  groupType: string;
  totalOtHours: number;
  otDays: number;
  details: { date: string; checkOut: string; otHours: number }[];
}

export default function ReportsPage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [startDate, setStartDate] = useState(formatDate(firstDay));
  const [endDate, setEndDate] = useState(formatDate(lastDay));
  const [stats, setStats] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<number | null>(null);
  const [history, setHistory] = useState<DailyRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [otSummary, setOtSummary] = useState<OtSummaryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"summary" | "ot" | "payroll">("summary");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfExportEmpId, setPdfExportEmpId] = useState<number | null>(null);

  async function loadStats() {
    setLoading(true);
    const [statsData, otData] = await Promise.all([
      getAttendanceStats(startDate, endDate),
      getOtSummary(startDate, endDate),
    ]);
    setStats(statsData);
    setOtSummary(otData);
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleLoad() {
    await loadStats();
    setSelectedEmp(null);
    setHistory([]);
  }

  async function handleViewHistory(empId: number) {
    setSelectedEmp(empId);
    setLoadingHistory(true);
    const data = await getEmployeeAttendanceHistory(empId, startDate, endDate);
    setHistory(data);
    setLoadingHistory(false);
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (pdfExportEmpId) params.set("empId", String(pdfExportEmpId));

      const res = await fetch(`/api/reports/pdf?${params.toString()}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const empName = pdfExportEmpId
        ? stats.find((s) => s.empId === pdfExportEmpId)?.name || "employee"
        : "all-employees";

      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${empName}-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง PDF: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setExportingPdf(false);
    }
  }

  function handleExportCsv() {
    const headers = ["No.", "Name", "Group", "Late", "Absent", "Leave", "WFH", "Work Hours", "OT Hours", "Avg Check-in"];
    const rows = stats.map((emp, idx) => {
      const ot = otSummary.find((o) => o.empId === emp.empId);
      return [
        idx + 1,
        emp.name,
        emp.groupType,
        emp.lateDays,
        emp.absentDays,
        emp.leaveDays,
        emp.wfhDays,
        emp.totalWorkHours,
        ot?.totalOtHours || 0,
        emp.avgCheckIn,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-summary-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleExportPayrollCsv() {
    setLoading(true);
    const allHistory: {
      empId: number;
      name: string;
      groupType: string;
      date: string;
      dayName: string;
      checkIn: string | null;
      checkOut: string | null;
      workHours: number | null;
      otHours: number;
      status: string;
    }[] = [];

    for (const emp of stats) {
      const hist = await getEmployeeAttendanceHistory(emp.empId, startDate, endDate);
      const ot = otSummary.find((o) => o.empId === emp.empId);

      for (const rec of hist) {
        let otHours = 0;
        if (rec.checkOut && ot) {
          const otDetail = ot.details.find((d) => d.date === rec.date);
          otHours = otDetail?.otHours || 0;
        }

        const d = new Date(rec.date);
        const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

        allHistory.push({
          empId: emp.empId,
          name: emp.name,
          groupType: emp.groupType,
          date: rec.date,
          dayName: dayNames[d.getDay()],
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          workHours: rec.workHours,
          otHours,
          status: rec.status,
        });
      }
    }

    const headers = [
      "ลำดับ", "ชื่อพนักงาน", "กลุ่ม", "วันที่", "วัน",
      "เวลาเข้า", "เวลาออก", "ชม.ทำงาน", "ชม.OT", "สถานะ"
    ];

    const rows = allHistory.map((rec, idx) => [
      idx + 1,
      rec.name,
      rec.groupType,
      rec.date,
      rec.dayName,
      rec.checkIn || "-",
      rec.checkOut || "-",
      rec.workHours !== null ? rec.workHours : "-",
      rec.otHours > 0 ? rec.otHours : "-",
      rec.status,
    ]);

    const summaryRows = ["", "", "", "", "", "", "", "", "", ""];
    const summaryHeader = ["", "สรุป", "", "", "", "", "", "", "", ""];

    const totalRows = stats.map((emp) => {
      const ot = otSummary.find((o) => o.empId === emp.empId);
      return [
        "",
        emp.name,
        emp.groupType,
        `ตรงเวลา ${emp.onTimeDays}`,
        `สาย ${emp.lateDays}`,
        `ขาด ${emp.absentDays}`,
        `ลา ${emp.leaveDays}`,
        `WFH ${emp.wfhDays}`,
        `${emp.totalWorkHours} ชม.`,
        `OT ${ot?.totalOtHours || 0} ชม.`,
      ].join(",");
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      summaryHeader.join(","),
      ...totalRows,
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  const selectedEmpData = stats.find((s) => s.empId === selectedEmp);

  const totalLate = stats.reduce((s, e) => s + e.lateDays, 0);
  const totalAbsent = stats.reduce((s, e) => s + e.absentDays, 0);
  const totalLeave = stats.reduce((s, e) => s + e.leaveDays, 0);
  const totalWfh = stats.reduce((s, e) => s + e.wfhDays, 0);
  const totalOtHours = otSummary.reduce((s, e) => s + e.totalOtHours, 0);
  const totalOtDays = otSummary.reduce((s, e) => s + e.otDays, 0);

  const totalLeaveByType: Record<string, number> = {};
  for (const emp of stats) {
    for (const [type, days] of Object.entries(emp.leaveDetails)) {
      totalLeaveByType[type] = (totalLeaveByType[type] || 0) + days;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">รายงานสถิติการเข้างาน</h1>
            <p className="mt-0.5 text-sm text-navy/50">ดูข้อมูลย้อนหลัง ขาด ลา มาสาย OT สรุปเงินเดือน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pdfExportEmpId || ""}
            onChange={(e) => setPdfExportEmpId(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
          >
            <option value="">ทุกคน</option>
            {stats.map((emp) => (
              <option key={emp.empId} value={emp.empId}>{emp.name}</option>
            ))}
          </select>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || loading}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exportingPdf ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            ดาวน์โหลด CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
        <h2 className="text-lg font-semibold text-navy mb-4">เลือกช่วงวันที่</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-navy/70">ตั้งแต่วันที่</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy/70">ถึงวันที่</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <button
            onClick={handleLoad}
            disabled={loading}
            className="rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "กำลังโหลด..." : "แสดงรายงาน"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border-l-4 border-l-red-500 bg-red-50 p-4">
          <p className="text-sm text-red-600 font-medium">มาสาย</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{totalLate}</p>
          <p className="text-xs text-red-400">ครั้ง</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-orange-400 bg-orange-50 p-4">
          <p className="text-sm text-orange-600 font-medium">ขาดงาน</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{totalAbsent}</p>
          <p className="text-xs text-orange-400">วัน</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-blue-400 bg-blue-50 p-4">
          <p className="text-sm text-blue-600 font-medium">ลางาน</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalLeave}</p>
          <p className="text-xs text-blue-400">วัน</p>
          {Object.keys(totalLeaveByType).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(totalLeaveByType).map(([type, days]) => (
                <span key={type} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LEAVE_TYPES[type]?.color || "bg-gray-100 text-gray-800"}`}>
                  {LEAVE_TYPES[type]?.label || type} {days}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border-l-4 border-l-green-400 bg-green-50 p-4">
          <p className="text-sm text-green-600 font-medium">WFH</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalWfh}</p>
          <p className="text-xs text-green-400">วัน</p>
        </div>
        <div className="rounded-xl border-l-4 border-l-purple-400 bg-purple-50 p-4">
          <p className="text-sm text-purple-600 font-medium">OT รวม</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{totalOtHours}</p>
          <p className="text-xs text-purple-400">ชม. ({totalOtDays} วัน)</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-cream-dark overflow-x-auto">
        <button
          onClick={() => setActiveTab("summary")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "summary"
              ? "border-gold text-gold-dark"
              : "border-transparent text-navy/50 hover:text-navy"
          }`}
        >
          สถิติพนักงาน
        </button>
        <button
          onClick={() => setActiveTab("ot")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "ot"
              ? "border-gold text-gold-dark"
              : "border-transparent text-navy/50 hover:text-navy"
          }`}
        >
          สรุป OT
        </button>
        <button
          onClick={() => setActiveTab("payroll")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "payroll"
              ? "border-gold text-gold-dark"
              : "border-transparent text-navy/50 hover:text-navy"
          }`}
        >
          รายงานเงินเดือน
        </button>
      </div>

      {activeTab === "summary" && (
        <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
          <div className="gradient-navy px-6 py-4">
            <h2 className="text-base font-semibold text-white">สถิติพนักงานแต่ละคน</h2>
          </div>
          {loading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-cream-dark rounded-lg" />
              ))}
            </div>
          ) : stats.length === 0 ? (
            <div className="p-8 text-center text-navy/50">ไม่มีข้อมูลในช่วงวันที่เลือก</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cream-dark bg-cream/50">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">ชื่อ</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">กลุ่ม</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ตรงเวลา</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">สาย</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ขาด</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ลา</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">WFH</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.ทำ</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.OT</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เข้าเฉลี่ย</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((emp) => {
                    const ot = otSummary.find((o) => o.empId === emp.empId);
                    return (
                      <tr
                        key={emp.empId}
                        className={`border-b border-cream-dark/50 transition-colors ${
                          selectedEmp === emp.empId ? "bg-gold/10" : "hover:bg-cream/30"
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-navy">{emp.name}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${emp.groupType === "A" ? "bg-navy/10 text-navy" : "bg-gold/20 text-gold-dark"}`}>
                            {emp.groupType}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-green-600 font-medium">{emp.onTimeDays}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-red-600 font-medium">{emp.lateDays}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-orange-600 font-medium">{emp.absentDays}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-blue-600 font-medium">
                          <div>{emp.leaveDays}</div>
                          {Object.keys(emp.leaveDetails).length > 0 && (
                            <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                              {Object.entries(emp.leaveDetails).map(([type, days]) => (
                                <span key={type} className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${LEAVE_TYPES[type]?.color || "bg-gray-100 text-gray-800"}`}>
                                  {LEAVE_TYPES[type]?.label || type} {days}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-green-600 font-medium">{emp.wfhDays}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{emp.totalWorkHours} ชม.</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-purple-600 font-medium">{ot?.totalOtHours || 0} ชม.</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{emp.avgCheckIn}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewHistory(emp.empId)}
                            className="rounded-lg border border-cream-dark px-3 py-1.5 text-xs font-medium text-navy/70 hover:bg-cream transition-colors"
                          >
                            ดูรายวัน
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "ot" && (
        <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
          <div className="gradient-navy px-6 py-4">
            <h2 className="text-base font-semibold text-white">สรุป OT แต่ละคน</h2>
          </div>
          {loading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-cream-dark rounded-lg" />
              ))}
            </div>
          ) : otSummary.length === 0 ? (
            <div className="p-8 text-center text-navy/50">ไม่มีข้อมูล OT</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cream-dark bg-cream/50">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">ชื่อ</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">กลุ่ม</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">วัน OT</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม. OT รวม</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {otSummary.filter((o) => o.otDays > 0).map((emp) => (
                    <tr key={emp.empId} className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-navy">{emp.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${emp.groupType === "A" ? "bg-navy/10 text-navy" : "bg-gold/20 text-gold-dark"}`}>
                          {emp.groupType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-purple-600">{emp.otDays} วัน</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-bold text-purple-700">{emp.totalOtHours} ชม.</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {emp.details.map((d, i) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                              {new Date(d.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} ({d.otHours} ชม.)
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {otSummary.filter((o) => o.otDays > 0).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-navy/50">ไม่มีพนักงานที่มี OT ในช่วงนี้</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "payroll" && (
        <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
          <div className="gradient-navy px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">รายงานเงินเดือน - สรุปการเข้างาน</h2>
              <p className="text-xs text-white/60 mt-1">ข้อมูลสำหรับฝ่ายบุคคลนำไปคำนวณเงินเดือน</p>
            </div>
            <button
              onClick={handleExportPayrollCsv}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ดาวน์โหลด CSV สำหรับเงินเดือน
            </button>
          </div>
          {loading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-cream-dark rounded-lg" />
              ))}
            </div>
          ) : stats.length === 0 ? (
            <div className="p-8 text-center text-navy/50">ไม่มีข้อมูลในช่วงวันที่เลือก</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cream-dark bg-cream/50">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">ชื่อพนักงาน</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">กลุ่ม</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">วันทำงาน</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ตรงเวลา</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">มาสาย</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ขาดงาน</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ลางาน</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">WFH</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.ทำงานรวม</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.OT รวม</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เข้าเฉลี่ย</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((emp) => {
                    const ot = otSummary.find((o) => o.empId === emp.empId);
                    return (
                      <tr
                        key={emp.empId}
                        className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors cursor-pointer"
                        onClick={() => handleViewHistory(emp.empId)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-navy">{emp.name}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${emp.groupType === "A" ? "bg-navy/10 text-navy" : "bg-gold/20 text-gold-dark"}`}>
                            {emp.groupType}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-navy">{emp.onTimeDays + emp.lateDays + emp.wfhDays}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{emp.onTimeDays}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${emp.lateDays > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>{emp.lateDays}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${emp.absentDays > 0 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>{emp.absentDays}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${emp.leaveDays > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{emp.leaveDays}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${emp.wfhDays > 0 ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>{emp.wfhDays}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-bold text-navy">{emp.totalWorkHours} ชม.</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className={`text-sm font-bold ${(ot?.totalOtHours || 0) > 0 ? "text-purple-700" : "text-navy/40"}`}>
                            {ot?.totalOtHours || 0} ชม.
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{emp.avgCheckIn}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-cream/50 font-bold">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-navy">รวมทั้งหมด</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy">-</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy">{stats.reduce((s, e) => s + e.onTimeDays + e.lateDays + e.wfhDays, 0)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-green-700">{stats.reduce((s, e) => s + e.onTimeDays, 0)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-red-700">{totalLate}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-orange-700">{totalAbsent}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-blue-700">{totalLeave}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-purple-700">{totalWfh}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy">{stats.reduce((s, e) => s + e.totalWorkHours, 0)} ชม.</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-purple-700">{totalOtHours} ชม.</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-cream-dark bg-cream/30 px-6 py-3">
            <p className="text-xs text-navy/40">* คลิกที่ชื่อพนักงานเพื่อดูรายละเอียดรายวัน กด &quot;ดาวน์โหลด CSV สำหรับเงินเดือน&quot; เพื่อ export ข้อมูลละเอียดทุกวัน</p>
          </div>
        </div>
      )}

      {selectedEmp && selectedEmpData && (
        <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
          <div className="gradient-navy px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              รายละเอียด {selectedEmpData.name} (กลุ่ม {selectedEmpData.groupType}) - {startDate} ถึง {endDate}
            </h2>
            <button
              onClick={() => { setSelectedEmp(null); setHistory([]); }}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
            >
              ปิด
            </button>
          </div>
          {loadingHistory ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-cream-dark rounded-lg" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-navy/50">ไม่มีข้อมูล</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cream-dark bg-cream/50">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">วันที่</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">วัน</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เวลาเข้า</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เวลาออก</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.ทำงาน</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">ชม.OT</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((rec) => {
                    const d = new Date(rec.date);
                    const dayName = d.toLocaleDateString("th-TH", { weekday: "short" });
                    const ot = otSummary.find((o) => o.empId === selectedEmp);
                    const otDetail = ot?.details.find((dt) => dt.date === rec.date);
                    return (
                      <tr key={rec.date} className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-navy">{rec.date}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{dayName}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{rec.checkIn || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{rec.checkOut || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy/70">{rec.workHours !== null ? `${rec.workHours} ชม.` : "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-purple-600">{otDetail ? `${otDetail.otHours} ชม.` : "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            rec.status === "ตรงเวลา" ? "bg-green-100 text-green-800" :
                            rec.status === "สาย" ? "bg-red-100 text-red-800" :
                            rec.status === "WFH" ? "bg-blue-100 text-blue-800" :
                            rec.status === "ลา" ? "bg-purple-100 text-purple-800" :
                            "bg-orange-100 text-orange-800"
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-cream/50 font-bold">
                    <td colSpan={4} className="whitespace-nowrap px-4 py-3 text-sm text-navy text-right">รวม</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-navy">
                      {history.reduce((s, r) => s + (r.workHours || 0), 0)} ชม.
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-purple-700">
                      {otSummary.find((o) => o.empId === selectedEmp)?.totalOtHours || 0} ชม.
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
