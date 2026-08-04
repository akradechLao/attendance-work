"use client";

import { useState, useEffect } from "react";

interface EmployeeStats {
  id: number;
  name: string;
  employeeCode: string | null;
  groupType: string;
  department: string | null;
  division: string | null;
  position: string;
  stats: {
    totalDays: number;
    lateDays: number;
    onTimeDays: number;
    monthTotal: number;
    monthLate: number;
  };
  today: {
    checkIn: string | null;
    checkOut: string | null;
    status: string | null;
  } | null;
}

interface ManagerData {
  manager: { id: number; name: string; position: string; department: string | null; division: string | null };
  managerLevel: number;
  employees: EmployeeStats[];
  departments: string[];
  divisions: string[];
}

const positionLabels: Record<string, string> = {
  employee: "พนักงาน",
  team_lead: "หัวหน้างาน",
  dept_manager: "ผู้จัดการแผนก",
  division_manager: "ผู้จัดการฝ่าย",
  assistant_md: "ผู้ช่วย กรรมการผู้จัดการ",
  md: "กรรมการผู้จัดการ",
};

export default function ManagerPage() {
  const [data, setData] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedDiv, setSelectedDiv] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((me) => {
        if (me.loggedIn && me.role === "employee" && me.userId) {
          fetch(`/api/manager?empId=${me.userId}`)
            .then((res) => res.json())
            .then((res) => {
              if (res.success) setData(res.data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEmployees = data?.employees.filter((emp) => {
    if (selectedDept && emp.department !== selectedDept) return false;
    if (selectedDiv && emp.division !== selectedDiv) return false;
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-sm text-navy/50">กำลังโหลด...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-4">
        <div className="text-center">
          <p className="text-navy/50">ไม่สามารถโหลดข้อมูลได้</p>
          <button onClick={() => window.location.href = "/login"} className="mt-4 text-sm text-navy/40 hover:text-navy/60">กลับหน้าล็อกอิน</button>
        </div>
      </div>
    );
  }

  const totalEmployees = filteredEmployees.length;
  const totalLate = filteredEmployees.reduce((sum, e) => sum + e.stats.lateDays, 0);
  const totalOnTime = filteredEmployees.reduce((sum, e) => sum + e.stats.onTimeDays, 0);
  const todayCheckedIn = filteredEmployees.filter((e) => e.today?.checkIn).length;

  return (
    <div className="min-h-screen bg-cream px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">ดูสถิติทีมงาน</h1>
            <p className="mt-0.5 text-sm text-navy/50">
              {data.manager.name} - {positionLabels[data.manager.position] || data.manager.position}
            </p>
          </div>
        </div>

        {/* Filters for senior management */}
        {data.managerLevel >= 3 && (
          <div className="mb-6 flex flex-wrap gap-3">
            {data.divisions.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-navy/70 mb-1">ฝ่าย</label>
                <select
                  value={selectedDiv}
                  onChange={(e) => { setSelectedDiv(e.target.value); setSelectedDept(""); }}
                  className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
                >
                  <option value="">ทั้งหมด</option>
                  {data.divisions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            {data.departments.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-navy/70 mb-1">แผนก</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
                >
                  <option value="">ทั้งหมด</option>
                  {data.departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-cream-dark bg-white p-4 text-center shadow-gold">
            <div className="text-2xl font-bold text-navy">{totalEmployees}</div>
            <div className="text-xs text-navy/40">พนักงาน</div>
          </div>
          <div className="rounded-xl border border-cream-dark bg-white p-4 text-center shadow-gold">
            <div className="text-2xl font-bold text-green-600">{todayCheckedIn}</div>
            <div className="text-xs text-navy/40">เช็คอินวันนี้</div>
          </div>
          <div className="rounded-xl border border-cream-dark bg-white p-4 text-center shadow-gold">
            <div className="text-2xl font-bold text-blue-600">{totalOnTime}</div>
            <div className="text-xs text-navy/40">ตรงเวลา (ปีนี้)</div>
          </div>
          <div className="rounded-xl border border-cream-dark bg-white p-4 text-center shadow-gold">
            <div className="text-2xl font-bold text-red-600">{totalLate}</div>
            <div className="text-xs text-navy/40">สาย (ปีนี้)</div>
          </div>
        </div>

        {/* Employee List */}
        <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
          <div className="gradient-navy px-5 py-3">
            <h3 className="text-sm font-semibold text-white">รายชื่อพนักงาน ({filteredEmployees.length} คน)</h3>
          </div>
          <div className="divide-y divide-cream-dark">
            {filteredEmployees.map((emp) => (
              <div key={emp.id} className="px-5 py-3 hover:bg-cream/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {emp.employeeCode && <span className="mr-1 text-navy/40">{emp.employeeCode}</span>}
                      {emp.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px]">
                      {emp.department && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">{emp.department}</span>}
                      {emp.division && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-purple-600">{emp.division}</span>}
                      {emp.position !== "employee" && (
                        <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-dark">{positionLabels[emp.position]}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    {emp.today ? (
                      <div>
                        <p className={`font-medium ${emp.today.status === "late" ? "text-red-600" : "text-green-600"}`}>
                          {emp.today.checkIn} - {emp.today.checkOut || "..."}
                        </p>
                        <p className="text-navy/40">{emp.today.status === "late" ? "สาย" : "ตรงเวลา"}</p>
                      </div>
                    ) : (
                      <p className="text-navy/30">ยังไม่เช็คอิน</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-[10px] text-navy/40">
                  <span>รวม {emp.stats.totalDays} วัน</span>
                  <span className="text-green-600">ตรง {emp.stats.onTimeDays}</span>
                  <span className="text-red-600">สาย {emp.stats.lateDays}</span>
                  <span className="text-orange-600">เดือนนี้ {emp.stats.monthTotal} วัน (สาย {emp.stats.monthLate})</span>
                </div>
              </div>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-navy/40">ไม่มีพนักงานในหน่วยงานที่เลือก</div>
            )}
          </div>
        </div>

        <button
          onClick={() => window.location.href = "/login"}
          className="mt-6 w-full text-center text-sm text-navy/40 hover:text-navy/60 transition-colors py-2"
        >
          กลับหน้าล็อกอิน
        </button>
      </div>
    </div>
  );
}
