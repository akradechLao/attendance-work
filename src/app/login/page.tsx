"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MottoBanner from "@/components/MottoBanner";
import QrScanner from "@/components/QrScanner";

interface Company {
  id: number;
  name: string;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [loginType, setLoginType] = useState<"admin" | "employee">("employee");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrMessage, setQrMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const sessionExpired = searchParams.get("expired") === "1";

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCompanies(data.data);
        } else {
          setCompaniesError(data.message || "โหลดรายชื่อบริษัทไม่สำเร็จ");
        }
      })
      .catch(() => {
        setCompaniesError("โหลดรายชื่อบริษัทไม่สำเร็จ");
      })
      .finally(() => {
        setCompaniesLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body:
        | { loginType: "admin"; username: string; password: string }
        | { loginType: "employee"; companyId: string; employeeCode: string; pin: string } = loginType === "admin"
        ? { loginType, username, password }
        : { loginType, companyId: selectedCompanyId, employeeCode, pin };

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

  const handleQrScan = async (rawData: string) => {
    setShowQrScanner(false);
    setQrLoading(true);
    setQrMessage(null);

    try {
      // Parse QR data format: companyId:employeeCode
      const parts = rawData.split(":");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        setQrMessage({ type: "error", text: "QR Code ไม่ถูกต้อง รูปแบบ: companyId:employeeCode" });
        return;
      }

      const companyId = parts[0];
      const employeeCode = parts[1];

      const res = await fetch("/api/auth/qr-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, employeeCode }),
      });

      const data = await res.json();

      if (data.success) {
        setQrMessage({ type: "success", text: `สแกนสำเร็จ! ${data.employee.name}` });
        setTimeout(() => {
          window.location.href = data.redirect || "/employee?qr=1";
        }, 800);
      } else {
        setQrMessage({ type: "error", text: data.message || "สแกนไม่สำเร็จ" });
      }
    } catch {
      setQrMessage({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally {
      setQrLoading(false);
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

        {sessionExpired && (
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs sm:text-sm text-amber-700 border border-amber-200">
            Session หมดอายุ กรุณาเข้าสู่ระบบใหม่
          </div>
        )}

        <div className="rounded-xl border border-cream-dark bg-white p-6 sm:p-8 shadow-gold">
          {/* QR Login Button - show only in employee mode */}
          {loginType === "employee" && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setShowQrScanner(true)}
                disabled={qrLoading}
                className="w-full rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100 hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {qrLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    สแกน QR Code เช็คอิน
                  </span>
                )}
              </button>

              {qrMessage && (
                <div
                  className={`mt-2 rounded-lg p-2 text-xs text-center ${
                    qrMessage.type === "success"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {qrMessage.text}
                </div>
              )}

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-cream-dark" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-navy/40">หรือเข้าสู่ระบบด้วยรหัส</span>
                </div>
              </div>
            </div>
          )}

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
                    disabled={companiesLoading || companies.length === 0}
                  >
                    <option value="">
                      {companiesLoading ? "กำลังโหลดบริษัท..." : "เลือกบริษัท"}
                    </option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {companiesError && (
                    <p className="mt-1 text-xs text-red-600">{companiesError}</p>
                  )}
                  {!companiesLoading && companies.length === 0 && !companiesError && (
                    <p className="mt-1 text-xs text-amber-600">ไม่พบบริษัทในระบบ</p>
                  )}
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

      {showQrScanner && <QrScanner onScan={handleQrScan} onClose={() => setShowQrScanner(false)} />}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-sm text-navy/50">กำลังโหลด...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
