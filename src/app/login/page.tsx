"use client";

import { useState, useEffect } from "react";
import MottoBanner from "@/components/MottoBanner";

interface Company {
  id: number;
  name: string;
}

export default function LoginPage() {
  const [loginType, setLoginType] = useState<"admin" | "employee">("employee");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCompanies(data.data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: any = { loginType };

      if (loginType === "admin") {
        body.username = username;
        body.password = password;
      } else {
        body.companyId = selectedCompanyId;
        body.employeeCode = employeeCode;
        body.pin = pin;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = data.redirect || "/";
      } else {
        setError(data.message);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full gradient-navy shadow-navy mb-4">
            <svg className="h-7 w-7 sm:h-8 sm:w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">HR Attendance</h1>
          <p className="mt-1 text-xs sm:text-sm text-navy/50">เข้าสู่ระบบจัดการ</p>
        </div>

        <MottoBanner />

        <div className="rounded-xl border border-cream-dark bg-white p-6 sm:p-8 shadow-gold">
          <div className="flex gap-2 mb-5 sm:mb-6">
            <button
              type="button"
              onClick={() => setLoginType("employee")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                loginType === "employee"
                  ? "gradient-navy text-white"
                  : "bg-cream text-navy/70 hover:bg-cream-dark"
              }`}
            >
              พนักงาน
            </button>
            <button
              type="button"
              onClick={() => setLoginType("admin")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                loginType === "admin"
                  ? "gradient-navy text-white"
                  : "bg-cream text-navy/70 hover:bg-cream-dark"
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginType === "employee" ? (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-navy/70">บริษัท</label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    required
                  >
                    <option value="">เลือกบริษัท</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-navy/70">รหัสพนักงาน</label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    placeholder="กรอกรหัสพนักงาน"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-navy/70">PIN</label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={4}
                    className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    placeholder="กรอก PIN 4 หลัก"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-navy/70">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    placeholder="กรอก username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-navy/70">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    placeholder="กรอก password"
                    required
                  />
                </div>
              </>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs sm:text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg gradient-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>

        <div className="mt-5 sm:mt-6 text-center text-[10px] sm:text-xs text-navy/40">
          ระบบบันทึกเวลาเข้า-ออกงาน v2.0
        </div>
      </div>
    </div>
  );
}
