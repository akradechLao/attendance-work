"use client";

import { useState, useEffect } from "react";
import { getAllEmployees, getTodayAttendance, getSundayMissingAfternoon, getSaturdayShiftCount } from "@/lib/attendance/queries";
import { getUpcomingLeaves } from "@/lib/leave-actions";
import { getSaturdayDate, isTodaySunday } from "@/lib/business-rules";
import StatCard from "@/components/StatCard";
import AttendanceTable from "@/components/AttendanceTable";
import LeaveCard from "@/components/LeaveCard";
import MottoBanner from "@/components/MottoBanner";

interface Company {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
  employeeCode: string | null;
  groupType: "A" | "B";
  department: string | null;
  companyId: number;
  wfhQuota: number;
}

interface AttendanceRecord {
  id: number;
  checkIn: string | null;
  checkInPhoto: string | null;
  checkOut: string | null;
  checkOutPhoto: string | null;
  status: "late" | "on_time" | null;
  latLong: string | null;
  date: string;
  employee: { id: number; name: string; employeeCode: string | null; groupType: "A" | "B"; department: string | null; companyId: number };
}

interface LeaveRecord {
  id: number;
  empId: number;
  companyId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: Date;
  employee: { id: number; name: string; groupType: string; companyId: number };
  leaveType: { id: number; name: string };
}

interface EmployeeDetail {
  employee: Employee;
  todayRecord: AttendanceRecord | null;
  recentRecords: AttendanceRecord[];
}

export default function HRDashboard() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [sundayMissing, setSundayMissing] = useState<AttendanceRecord[]>([]);
  const [satCount, setSatCount] = useState(0);
  const [upcomingLeaves, setUpcomingLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [employeeDetail, setEmployeeDetail] = useState<EmployeeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      if (data.success) setCompanies(data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [emps, attendance, missing, sat, leaves] = await Promise.all([
          getAllEmployees(),
          getTodayAttendance(),
          getSundayMissingAfternoon(),
          getSaturdayShiftCount(getSaturdayDate()),
          getUpcomingLeaves(),
        ]);
        if (!active) return;
        setAllEmployees(emps as Employee[]);
        setAllAttendance(attendance as AttendanceRecord[]);
        setSundayMissing(missing as AttendanceRecord[]);
        setSatCount(sat);
        setUpcomingLeaves(leaves as LeaveRecord[]);
      } catch (error) {
        console.error("Database error:", error);
        if (active) setDbError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const employees = selectedCompanyId === "all"
    ? allEmployees
    : allEmployees.filter((e) => e.companyId === Number(selectedCompanyId));

  const todayAttendance = selectedCompanyId === "all"
    ? allAttendance
    : allAttendance.filter((r) => r.employee.companyId === Number(selectedCompanyId));

  const filteredSundayMissing = selectedCompanyId === "all"
    ? sundayMissing
    : sundayMissing.filter((r) => r.employee.companyId === Number(selectedCompanyId));

  const filteredLeaves = selectedCompanyId === "all"
    ? upcomingLeaves
    : upcomingLeaves.filter((l) => l.companyId === Number(selectedCompanyId));

  useEffect(() => {
    if (!selectedEmpId) { setEmployeeDetail(null); return; }
    setLoadingDetail(true);
    const emp = allEmployees.find((e) => e.id === selectedEmpId);
    if (!emp) { setLoadingDetail(false); return; }
    const todayRecord = todayAttendance.find((r) => r.employee.id === selectedEmpId) || null;
    const recentRecords = allAttendance.filter((r) => r.employee.id === selectedEmpId);
    setEmployeeDetail({ employee: emp, todayRecord, recentRecords });
    setLoadingDetail(false);
  }, [selectedEmpId, allEmployees, todayAttendance, allAttendance]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 bg-gold/30 rounded-full" />
          <div>
            <div className="h-8 w-48 bg-cream-dark rounded" />
            <div className="h-4 w-64 bg-cream-dark rounded mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-cream-dark rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-cream-dark rounded-xl" />
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">แดชบอร์ด HR</h1>
            <p className="mt-0.5 text-sm text-navy/50">ภาพรวมการเข้างานของพนักงาน</p>
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-red-800">ไม่สามารถเชื่อมต่อฐานข้อมูลได้</h3>
          <p className="mt-2 text-red-700">กรุณาตรวจสอบการตั้งค่า DATABASE_URL</p>
          <div className="mt-4 rounded-lg bg-white p-4 border border-red-200">
            <p className="text-sm font-medium text-red-800">ตรวจสอบ:</p>
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              <li>1. สร้าง database ชื่อ <code className="bg-red-100 px-1 rounded">attendance_db</code> บน Supabase แล้วหรือยัง</li>
              <li>2. DATABASE_URL ตั้งค่าถูกต้องใน Netlify แล้วหรือยัง</li>
              <li>3. รัน <code className="bg-red-100 px-1 rounded">npx prisma db push</code> แล้วหรือยัง</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const lateCount = todayAttendance.filter((r) => r.status === "late").length;
  const checkedInCount = todayAttendance.length;
  const notCheckedIn = employees.length - checkedInCount;

  return (
    <div className="space-y-8">
      <MottoBanner />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">แดชบอร์ด HR</h1>
            <p className="mt-0.5 text-sm text-navy/50">ภาพรวมการเข้างานของพนักงาน</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          ออกจากระบบ
        </button>
      </div>

      {/* Company Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-navy/70">บริษัท:</label>
        <select
          value={selectedCompanyId}
          onChange={(e) => { setSelectedCompanyId(e.target.value); setSelectedEmpId(null); }}
          className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
        >
          <option value="all">ทั้งหมด</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label className="text-sm font-medium text-navy/70 ml-4">พนักงาน:</label>
        <select
          value={selectedEmpId || ""}
          onChange={(e) => setSelectedEmpId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
        >
          <option value="">-- ทั้งหมด --</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.employeeCode ? emp.employeeCode + " - " : ""}{emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="พนักงานทั้งหมด"
          value={employees.length}
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          color="navy"
        />
        <StatCard
          title="เข้างานแล้ววันนี้"
          value={checkedInCount}
          subtitle={notCheckedIn > 0 ? `ยังไม่เช็คอิน ${notCheckedIn} คน` : "ครบทุกคน"}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="green"
        />
        <StatCard
          title="สายวันนี้"
          value={lateCount}
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="red"
        />
        <StatCard
          title="เวรวันเสาร์"
          value={satCount}
          subtitle={satCount < 2 ? `ต้องการอย่างน้อย 2 คน` : "ครบแล้ว"}
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          color={satCount < 2 ? "red" : "gold"}
        />
      </div>

      {/* Employee Detail Panel */}
      {selectedEmpId && employeeDetail && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-navy">รายละเอียดพนักงาน</h3>
            <button
              onClick={() => setSelectedEmpId(null)}
              className="rounded-lg bg-white border border-cream-dark px-3 py-1.5 text-xs text-navy/60 hover:bg-cream transition-colors"
            >
              ปิด
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm"><span className="text-navy/50">ชื่อ:</span> <span className="font-semibold text-navy">{employeeDetail.employee.name}</span></p>
              <p className="text-sm"><span className="text-navy/50">รหัส:</span> {employeeDetail.employee.employeeCode || "-"}</p>
              <p className="text-sm"><span className="text-navy/50">กลุ่ม:</span> {employeeDetail.employee.groupType}</p>
              <p className="text-sm"><span className="text-navy/50">หน่วยงาน:</span> {employeeDetail.employee.department || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-navy mb-2">เข้างานวันนี้</p>
              {employeeDetail.todayRecord ? (
                <div className="space-y-1 text-sm">
                  <p>เช็คอิน: <span className="font-medium text-navy">{employeeDetail.todayRecord.checkIn || "-"}</span></p>
                  <p>เช็คออก: <span className="font-medium text-navy">{employeeDetail.todayRecord.checkOut || "-"}</span></p>
                  <p>สถานะ: <span className={`font-medium ${employeeDetail.todayRecord.status === "late" ? "text-red-600" : employeeDetail.todayRecord.status === "on_time" ? "text-green-600" : "text-navy/30"}`}>
                    {employeeDetail.todayRecord.status === "late" ? "สาย" : employeeDetail.todayRecord.status === "on_time" ? "ตรงเวลา" : "-"}
                  </span></p>
                </div>
              ) : (
                <p className="text-sm text-navy/40">ยังไม่เช็คอินวันนี้</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <AttendanceTable records={todayAttendance} title="สรุปการเข้างานวันนี้" />

      {/* Leave */}
      <LeaveCard leaves={filteredLeaves} title="ลางานล่วงหน้า 7 วัน" />

      {/* Alerts */}
      {satCount < 2 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-red-800">แจ้งเตือนเวรวันเสาร์</h3>
          <p className="mt-2 text-red-700">
            มีพนักงานเข้าเวรวันเสาร์เพียง <span className="font-bold">{satCount}</span> คน
            ต้องการอย่างน้อย 2 คน!
          </p>
        </div>
      )}

      {isTodaySunday() && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-red-800">แจ้งเตือน - ขาดการเช็คอินช่วงบ่ายวันอาทิตย์</h3>
          {filteredSundayMissing.length === 0 ? (
            <p className="mt-2 text-red-700">ไม่มีข้อมูลการเช็คอินช่วงบ่ายวันอาทิตย์</p>
          ) : (
            <div className="mt-3 space-y-2">
              {filteredSundayMissing.map((record) => (
                <div key={record.id} className="flex items-center gap-2 text-red-700">
                  <span className="font-bold text-red-600">{record.employee.name}</span>
                  <span>(กลุ่ม {record.employee.groupType})</span>
                  <span>-</span>
                  <span>เช็คอินเวลา {record.checkIn}</span>
                  <span className="font-medium">แต่ยังไม่เช็คอินช่วงบ่ายหลัง 13:00</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lateCount > 0 && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gold-dark">พนักงานสายวันนี้</h3>
          <div className="mt-3 space-y-2">
            {todayAttendance
              .filter((r) => r.status === "late")
              .map((record) => (
                <div key={record.id} className="flex items-center gap-2 text-navy/70">
                  <span className="font-bold text-navy">{record.employee.name}</span>
                  <span className="text-navy/50">(กลุ่ม {record.employee.groupType})</span>
                  <span className="text-navy/30">-</span>
                  <span>เช็คอินเวลา {record.checkIn}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
