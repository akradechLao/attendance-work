"use client";

import { useState, useEffect } from "react";

interface OtRequest {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: string;
  createdAt: string;
  employee: {
    name: string;
    employeeCode: string | null;
    department: string | null;
  };
}

export default function SupervisorPage() {
  const [requests, setRequests] = useState<OtRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn && data.role === "admin") {
          setCompanyId(data.companyId || null);
        }
      });
  }, []);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    fetch(`/api/ot-request/list?companyId=${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRequests(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleApprove = async (id: number, status: "approved" | "rejected") => {
    try {
      const res = await fetch("/api/ot-request/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, approvedBy: "Admin" }),
      });
      const data = await res.json();
      if (data.success) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {}
  };

  const pendingCount = requests.length;

  return (
    <div className="min-h-screen bg-cream px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-1.5 gradient-gold rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-navy">อนุมัติคำขอโอที</h1>
            <p className="mt-0.5 text-sm text-navy/50">
              {pendingCount > 0 ? `มี ${pendingCount} รายการรออนุมัติ` : "ไม่มีรายการรออนุมัติ"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-navy/40">กำลังโหลด...</div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-cream-dark bg-white p-12 text-center shadow-gold">
            <svg className="mx-auto h-12 w-12 text-navy/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-navy/40">ไม่มีคำขอโอทีที่รออนุมัติ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="rounded-xl border border-cream-dark bg-white p-4 shadow-gold">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-navy">
                        {req.employee.employeeCode && <span className="mr-1">{req.employee.employeeCode}</span>}
                        {req.employee.name}
                      </span>
                      {req.employee.department && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">{req.employee.department}</span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-navy/60">
                      <div>วันที่: <span className="font-medium text-navy">{req.date}</span></div>
                      <div>เวลา: <span className="font-medium text-navy">{req.startTime} - {req.endTime}</span></div>
                    </div>
                    <p className="mt-2 text-xs text-navy/50">เหตุผล: {req.reason}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id, "approved")}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                  >
                    อนุมัติ
                  </button>
                  <button
                    onClick={() => handleApprove(req.id, "rejected")}
                    className="flex-1 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                  >
                    ปฏิเสธ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
