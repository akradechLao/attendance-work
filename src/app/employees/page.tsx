"use client";

import { useEffect, useState } from "react";
import { getAllEmployees } from "@/lib/attendance/queries";
import { getWfhOfMonthBulk } from "@/lib/wfh/actions";
import { createEmployee, updateEmployee, deleteEmployee } from "@/lib/employees/actions";


interface Employee {
  id: number;
  name: string;
  employeeCode: string | null;
  companyId: number;
  company?: { name: string };
  groupType: "A" | "B";
  department: string | null;
  division: string | null;
  position: string;
  level: number | null;
  hasOt: boolean;
  reportsTo: number | null;
  wfhQuota: number;
  preferredOffDay: string | null;
}

interface EmployeeForm {
  name: string;
  groupType: "A" | "B";
  department: string;
  division: string;
  position: string;
  level: string;
  hasOt: boolean;
  reportsTo: string;
  preferredOffDay: string;
}

const emptyForm: EmployeeForm = {
  name: "",
  groupType: "A",
  department: "",
  division: "",
  position: "employee",
  level: "",
  hasOt: false,
  reportsTo: "",
  preferredOffDay: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [wfhUsage, setWfhUsage] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | null }>({ text: "", type: null });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);


  async function fetchData() {
    const [emps, usage] = await Promise.all([getAllEmployees(), getWfhOfMonthBulk()]);
    return { emps, usage };
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const { emps, usage } = await fetchData();
        if (!active) return;
        setEmployees(emps);
        setWfhUsage(usage);
      } catch (error) {
        console.error("Load error:", error);
        setMessage({ text: "ไม่สามารถโหลดข้อมูลได้", type: "error" });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function refreshData() {
    setLoading(true);
    try {
      const { emps, usage } = await fetchData();
      setEmployees(emps);
      setWfhUsage(usage);
    } catch (error) {
      console.error("Load error:", error);
      setMessage({ text: "ไม่สามารถโหลดข้อมูลได้", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: null }), 3000);
  }

  function handleAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  }

  function handleEdit(emp: Employee) {
    setForm({
      name: emp.name,
      groupType: emp.groupType,
      department: emp.department || "",
      division: emp.division || "",
      position: emp.position || "employee",
      level: emp.level ? String(emp.level) : "",
      hasOt: emp.hasOt,
      reportsTo: emp.reportsTo ? String(emp.reportsTo) : "",
      preferredOffDay: emp.preferredOffDay || "",
    });
    setEditId(emp.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showMessage("กรุณากรอกชื่อพนักงาน", "error");
      return;
    }

    setSubmitting(true);
    try {
      const preferredOffDay = form.preferredOffDay || null;
      const reportsTo = form.reportsTo ? Number(form.reportsTo) : null;
      const level = form.level ? Number(form.level) : null;
      const opts = {
        department: form.department || null,
        division: form.division || null,
        position: form.position,
        level,
        hasOt: form.hasOt,
        reportsTo,
      };
      const result = editId
        ? await updateEmployee(editId, form.name.trim(), form.groupType, preferredOffDay, opts)
        : await createEmployee(form.name.trim(), form.groupType, preferredOffDay, opts);

      if (result.success) {
        showMessage(result.message, "success");
        setShowForm(false);
        setForm(emptyForm);
        setEditId(null);
        await refreshData();
      } else {
        showMessage(result.message || "เกิดข้อผิดพลาด", "error");
      }
    } catch (error) {
      console.error("Submit error:", error);
      showMessage("เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const result = await deleteEmployee(id);
      if (result.success) {
        showMessage(result.message, "success");
        setDeleteConfirm(null);
        await refreshData();
      } else {
        showMessage(result.message || "เกิดข้อผิดพลาด", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showMessage("เกิดข้อผิดพลาดในการลบ", "error");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">จัดการพนักงาน</h1>
            <p className="mt-0.5 text-sm text-navy/50">เพิ่ม แก้ไข และลบรายชื่อพนักงาน</p>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
        >
          + เพิ่มพนักงาน
        </button>
      </div>

      {message.text && message.type && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
          <h2 className="text-lg font-semibold text-navy mb-4">
            {editId ? "แก้ไขพนักงาน" : "เพิ่มพนักงานใหม่"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-navy/70">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">กลุ่มพนักงาน</label>
                <select
                  value={form.groupType}
                  onChange={(e) => setForm({ ...form, groupType: e.target.value as "A" | "B" })}
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">ฝ่าย (Division)</label>
                <input
                  type="text"
                  value={form.division}
                  onChange={(e) => setForm({ ...form, division: e.target.value })}
                  placeholder="เช่น ฝ่ายผลิต, ฝ่ายขาย"
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">แผนก (Department)</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="เช่น แผนกผลิต, แผนกบัญชี"
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">ระดับตำแหน่ง</label>
                <select
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                >
                  <option value="employee">พนักงาน</option>
                  <option value="team_lead">หัวหน้างาน</option>
                  <option value="dept_manager">ผู้จัดการแผนก</option>
                  <option value="division_manager">ผู้จัดการฝ่าย</option>
                  <option value="assistant_md">ผู้ช่วย กรรมการผู้จัดการ</option>
                  <option value="md">กรรมการผู้จัดการ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">Level (ความอาวุโส)</label>
                <input
                  type="number"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  placeholder="เช่น 1, 3, 6"
                  min="1"
                  max="10"
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={form.hasOt}
                    onChange={(e) => setForm({ ...form, hasOt: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-cream-dark after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
                </label>
                <span className="text-sm font-medium text-navy/70">สิทธิ์เบิกค่าโอที</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">หัวหน้าโดยตรง (ID)</label>
                <input
                  type="number"
                  value={form.reportsTo}
                  onChange={(e) => setForm({ ...form, reportsTo: e.target.value })}
                  placeholder="ID ของหัวหน้า"
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">วันหยุดประจำ</label>
                <select
                  value={form.preferredOffDay}
                  onChange={(e) => setForm({ ...form, preferredOffDay: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-4 py-2.5 text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                >
                  <option value="">ไม่ระบุ</option>
                  <option value="Saturday">เสาร์</option>
                  <option value="Sunday">อาทิตย์</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy/70">WFH เดือนนี้</label>
                <div className="mt-1 rounded-lg border border-cream-dark bg-cream/30 px-4 py-2.5 text-navy">
                  1 วัน/เดือน (วันเสาร์)
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm(emptyForm);
                }}
                className="rounded-lg border border-cream-dark px-4 py-2.5 text-sm font-medium text-navy/70 hover:bg-cream transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
        <div className="gradient-navy px-6 py-4">
          <h2 className="text-base font-semibold text-white">รายชื่อพนักงานทั้งหมด ({employees.length} คน)</h2>
        </div>

        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-cream-dark rounded-lg" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-navy/50">ยังไม่มีพนักงานในระบบ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-dark bg-cream/50">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">รหัส</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-navy/60 uppercase">ชื่อ-นามสกุล</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">กลุ่ม</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">เวลาทำงาน</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">WFH เดือนนี้</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold text-navy/60 uppercase">วันหยุด</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-navy/60 uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-navy/60">{emp.id}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-navy">{emp.name}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          emp.groupType === "A" ? "bg-navy/10 text-navy" : "bg-gold/20 text-gold-dark"
                        }`}
                      >
                        กลุ่ม {emp.groupType}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-xs text-navy/70">
                      {emp.groupType === "A" ? "08:00-17:00" : "07:00-16:00 (+OT)"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-navy/70">
                      {wfhUsage[emp.id] || 0} / {emp.wfhQuota} วัน
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-navy/70">
                      {emp.preferredOffDay === "Saturday" ? "เสาร์" : emp.preferredOffDay === "Sunday" ? "อาทิตย์" : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="rounded-lg border border-cream-dark px-3 py-1.5 text-xs font-medium text-navy/70 hover:bg-cream transition-colors"
                        >
                          แก้ไข
                        </button>
                        {deleteConfirm === emp.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                            >
                              ยืนยัน
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-lg border border-cream-dark px-3 py-1.5 text-xs font-medium text-navy/70 hover:bg-cream transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(emp.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
