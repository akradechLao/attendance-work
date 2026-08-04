"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MottoBanner from "@/components/MottoBanner";

interface Company {
  id: number;
  name: string;
}

interface EmployeeSearchResult {
  id: number;
  name: string;
  employeeCode: string | null;
  groupType: string;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [loginType, setLoginType] = useState<"admin" | "employee">("employee");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState("");

  // Employee search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EmployeeSearchResult[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Admin
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sessionExpired = searchParams.get("expired") === "1";

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCompanies(data.data);
        else setCompaniesError(data.message || "โหลดรายชื่อบริษัทไม่สำเร็จ");
      })
      .catch(() => setCompaniesError("โหลดรายชื่อบริษัทไม่สำเร็จ"))
      .finally(() => setCompaniesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCompanyId || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/employees/search?companyId=${selectedCompanyId}&q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setSearchResults(data.data);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedCompanyId, searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedEmployee(null);
    setSearchQuery("");
    setSearchResults([]);
  }, [selectedCompanyId]);

  const handleEmployeeSelect = (emp: EmployeeSearchResult) => {
    setSelectedEmployee(emp);
    setSearchQuery(`${emp.employeeCode ? emp.employeeCode + " - " : ""}${emp.name}`);
    setShowDropdown(false);
  };

  const handleEmployeeCheckin = async () => {
    if (!selectedEmployee || !selectedCompanyId) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginType: "employee", companyId: selectedCompanyId, employeeCode: selectedEmployee.employeeCode }),
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = data.redirect || "/employee";
      } else {
        setError(data.message);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginType: "admin", username, password }),
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

        {sessionExpired && (
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs sm:text-sm text-amber-700 border border-amber-200">
            Session หมดอายุ กรุณาเข้าสู่ระบบใหม่
          </div>
        )}

        <div className="rounded-xl border border-cream-dark bg-white p-6 sm:p-8 shadow-gold">
          <div className="flex gap-2 mb-5 sm:mb-6">
            <button
              type="button"
              onClick={() => setLoginType("employee")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                loginType === "employee" ? "gradient-navy text-white" : "bg-cream text-navy/70 hover:bg-cream-dark"
              }`}
            >
              พนักงาน
            </button>
            <button
              type="button"
              onClick={() => setLoginType("admin")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                loginType === "admin" ? "gradient-navy text-white" : "bg-cream text-navy/70 hover:bg-cream-dark"
              }`}
            >
              Admin
            </button>
          </div>

          {loginType === "employee" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-navy/70 mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">1</span>
                    เลือกบริษัท
                  </span>
                </label>
                {companiesLoading ? (
                  <div className="text-center py-4 text-sm text-navy/40">กำลังโหลดบริษัท...</div>
                ) : companiesError ? (
                  <div className="text-center py-4 text-sm text-red-500">{companiesError}</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCompanyId(String(c.id))}
                        className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-all ${
                          selectedCompanyId === String(c.id)
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                            : "border-cream-dark bg-white text-navy/70 hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCompanyId && (
                <div ref={searchRef} className="relative">
                  <label className="block text-xs sm:text-sm font-medium text-navy/70">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">2</span>
                      ค้นหาชื่อหรือรหัสพนักงาน
                    </span>
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedEmployee(null);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="พิมพ์ชื่อหรือรหัสพนักงาน..."
                    className="mt-1 w-full rounded-lg border border-cream-dark bg-cream/50 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                  />
                  {searching && (
                    <div className="absolute right-3 top-[38px] text-xs text-navy/40">ค้นหา...</div>
                  )}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-cream-dark bg-white shadow-navy max-h-60 overflow-y-auto">
                      {searchResults.map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => handleEmployeeSelect(emp)}
                          className="w-full px-4 py-3 text-left hover:bg-cream/50 transition-colors border-b border-cream-dark/50 last:border-0"
                        >
                          <div className="text-sm font-medium text-navy">
                            {emp.employeeCode && <span className="text-navy/50 mr-2">{emp.employeeCode}</span>}
                            {emp.name}
                          </div>
                          <div className="text-[10px] text-navy/40">กลุ่ม {emp.groupType}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && searchQuery && !searching && searchResults.length === 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-cream-dark bg-white shadow-navy p-4 text-center text-sm text-navy/40">
                      ไม่พบพนักงาน
                    </div>
                  )}
                </div>
              )}

              {selectedEmployee && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-xs text-green-600 mb-1">เลือกพนักงาน:</p>
                  <p className="text-sm font-semibold text-green-800">
                    {selectedEmployee.employeeCode && <span className="mr-1">{selectedEmployee.employeeCode}</span>}
                    {selectedEmployee.name}
                  </p>
                  <p className="text-[10px] text-green-600">กลุ่ม {selectedEmployee.groupType}</p>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-xs sm:text-sm text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <button
                onClick={handleEmployeeCheckin}
                disabled={!selectedEmployee || loading}
                className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "กำลังเข้าสู่ระบบ..." : "เช็คอิน"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
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
          )}
        </div>

        <div className="mt-5 sm:mt-6 text-center text-[10px] sm:text-xs text-navy/40">
          ระบบบันทึกเวลาเข้า-ออกงาน v2.0
        </div>
      </div>
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
