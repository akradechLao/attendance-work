"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { checkIn, checkOut } from "@/lib/attendance/actions";

interface Employee {
  id: number;
  name: string;
  employeeCode: string | null;
  groupType: string;
  department: string | null;
  supervisorName: string | null;
  supervisorLine: string | null;
  supervisorPhone: string | null;
  companyId: number;
}

function CheckinContent() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action") as "checkin" | "checkout" | null;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // OT form
  const [showOtForm, setShowOtForm] = useState(false);
  const [otDate, setOtDate] = useState(new Date().toISOString().split("T")[0]);
  const [otStart, setOtStart] = useState("17:00");
  const [otEnd, setOtEnd] = useState("20:00");
  const [otReason, setOtReason] = useState("");
  const [otLoading, setOtLoading] = useState(false);
  const [otMessage, setOtMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Stats
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getLocation = useCallback(async () => {
    return new Promise<{ latLong: string | null }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latLong: "GPS not available" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latLong: `${pos.coords.latitude},${pos.coords.longitude}` }),
        () => resolve({ latLong: "GPS not available" }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn && data.role === "employee" && data.userId) {
          fetch(`/api/employees/search?companyId=${data.companyId || 1}&q=`)
            .then((res) => res.json())
            .then((res) => {
              const emp = res.data?.find((e: Employee) => e.id === data.userId);
              if (emp) {
                setEmployee(emp);
                setShowCamera(true);
              } else {
                setMessage({ type: "error", text: "ไม่พบข้อมูลพนักงาน" });
              }
              setLoading(false);
            })
            .catch(() => {
              setMessage({ type: "error", text: "ไม่สามารถโหลดข้อมูลได้" });
              setLoading(false);
            });
        } else {
          setMessage({ type: "error", text: "กรุณาเข้าสู่ระบบใหม่" });
          setLoading(false);
        }
      })
      .catch(() => {
        setMessage({ type: "error", text: "กรุณาเข้าสู่ระบบใหม่" });
        setLoading(false);
      });
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setMessage({ type: "error", text: "ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง" });
    }
  }, []);

  useEffect(() => {
    if (showCamera && !capturedPhoto) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [showCamera, capturedPhoto, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.6);
  }, []);

  const handleCapture = useCallback(async () => {
    const photo = capturePhoto();
    if (!photo) return;

    setCapturedPhoto(photo);
    setSubmitting(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const { latLong } = await getLocation();
    const finalLatLong = latLong || "GPS not available";

    let photoUrl: string | undefined;
    try {
      const res = await fetch(photo);
      const blob = await res.blob();
      const file = new File([blob], "checkin.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("type", action === "checkout" ? "checkout" : "checkin");
      formData.append("empId", String(employee!.id));
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await uploadRes.json();
      if (data.success) photoUrl = data.imageUrl;
    } catch {}

    const result = action === "checkout"
      ? await checkOut(employee!.id, finalLatLong, photoUrl)
      : await checkIn(employee!.id, finalLatLong, photoUrl);

    setMessage({ type: result.success ? "success" : "error", text: result.message });
    if (result.distanceInfo) setDistanceInfo(result.distanceInfo);
    setSubmitting(false);
  }, [capturePhoto, getLocation, employee, action]);

  const handleOtSubmit = async () => {
    if (!employee || !otReason.trim()) return;
    setOtLoading(true);
    setOtMessage(null);
    try {
      const res = await fetch("/api/ot-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empId: employee.id,
          companyId: employee.companyId,
          date: otDate,
          startTime: otStart,
          endTime: otEnd,
          reason: otReason,
        }),
      });
      const data = await res.json();
      setOtMessage({ type: data.success ? "success" : "error", text: data.message });
      if (data.success) {
        setOtReason("");
        setTimeout(() => { setShowOtForm(false); setOtMessage(null); }, 2000);
      }
    } catch {
      setOtMessage({ type: "error", text: "เกิดข้อผิดพลาด" });
    } finally {
      setOtLoading(false);
    }
  };

  const handleShowStats = async () => {
    if (!employee) return;
    setShowStats(true);
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/employee-stats?empId=${employee.id}`);
      const data = await res.json();
      if (data.success) setStatsData(data.data);
    } catch {} finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-sm text-navy/50">กำลังโหลด...</div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-4">
        <div className="w-full max-w-sm text-center">
          <div className={`rounded-xl border p-8 ${message.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${message.type === "success" ? "bg-green-100" : "bg-red-100"}`}>
              {message.type === "success" ? (
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p className={`text-lg font-semibold ${message.type === "success" ? "text-green-800" : "text-red-800"}`}>
              {message.text}
            </p>
            {distanceInfo && (
              <p className="mt-2 text-sm text-blue-600">{distanceInfo}</p>
            )}
            {employee && (
              <div className="mt-2 text-sm text-navy/60">
                <p>{employee.employeeCode && <span className="mr-1">{employee.employeeCode}</span>}{employee.name}</p>
                {employee.department && <p className="text-xs text-navy/40">{employee.department}</p>}
              </div>
            )}
          </div>
          <button
            onClick={() => window.location.href = "/login"}
            className="mt-6 rounded-lg bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 transition-colors"
          >
            กลับหน้าล็อกอิน
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-6">
      <div className="mx-auto max-w-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full gradient-navy shadow-navy mb-3">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-navy">
            {action === "checkout" ? "เช็คออก" : "เช็คอิน"}
          </h1>
          {employee && (
            <div className="mt-1">
              <p className="text-sm font-medium text-navy/70">
                {employee.employeeCode && <span className="mr-1">{employee.employeeCode}</span>}
                {employee.name}
              </p>
              {employee.department && (
                <p className="mt-0.5 text-xs text-navy/40">{employee.department}</p>
              )}
            </div>
          )}
        </div>

        {/* Camera */}
        {showCamera && !capturedPhoto && (
          <div className="mb-6">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="mx-auto w-full max-w-xs rounded-xl object-cover border-2 border-cream-dark shadow-gold"
              style={{ transform: "scaleX(-1)" }}
            />
            <button
              onClick={handleCapture}
              disabled={submitting}
              className="mt-4 mx-auto flex items-center gap-2 rounded-full bg-red-500 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ถ่ายภาพ
            </button>
          </div>
        )}

        {capturedPhoto && (
          <div className="mb-6">
            <img
              src={capturedPhoto}
              alt="Captured"
              className="mx-auto w-full max-w-xs rounded-xl object-cover border-2 border-green-400 shadow-gold"
            />
            <p className="mt-3 text-sm text-green-600 font-medium animate-pulse text-center">
              {submitting ? "กำลังบันทึก..." : "บันทึกสำเร็จ"}
            </p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Menu Buttons */}
        {!showCamera && !capturedPhoto && !message && (
          <div className="space-y-3">
            {/* ลาหยุด */}
            <a
              href="/leaves"
              className="flex items-center gap-3 rounded-xl border border-cream-dark bg-white p-4 shadow-gold hover:bg-cream/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">ลาหยุด</p>
                <p className="text-[10px] text-navy/40">ส่งคำขอลาหยุด</p>
              </div>
            </a>

            {/* ขอโอที */}
            <button
              onClick={() => setShowOtForm(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-cream-dark bg-white p-4 shadow-gold hover:bg-cream/50 transition-colors text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
                <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">ขอโอที</p>
                <p className="text-[10px] text-navy/40">ขออนุญาตทำโอที</p>
              </div>
            </button>

            {/* สถิติของฉัน */}
            <button
              onClick={handleShowStats}
              className="flex w-full items-center gap-3 rounded-xl border border-cream-dark bg-white p-4 shadow-gold hover:bg-cream/50 transition-colors text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-navy">สถิติของฉัน</p>
                <p className="text-[10px] text-navy/40">ดูประวัติเข้างานและสรุป</p>
              </div>
            </button>

            {/* ติดต่อหัวหน้า */}
            {employee?.supervisorName && (
              <div className="rounded-xl border border-cream-dark bg-white p-4 shadow-gold">
                <p className="text-xs text-navy/40 mb-2">ผู้บังคับบัญชา</p>
                <p className="text-sm font-semibold text-navy mb-3">{employee.supervisorName}</p>
                <div className="flex gap-2">
                  {employee.supervisorLine && (
                    <a
                      href={`https://line.me/ti/p/${employee.supervisorLine}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-green-600 transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                      </svg>
                      LINE
                    </a>
                  )}
                  {employee.supervisorPhone && (
                    <a
                      href={`tel:${employee.supervisorPhone}`}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      โทร
                    </a>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => window.location.href = "/login"}
              className="w-full text-center text-sm text-navy/40 hover:text-navy/60 transition-colors py-2"
            >
              ออกจากระบบ
            </button>
          </div>
        )}

        {/* OT Form Modal */}
        {showOtForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl border border-cream-dark bg-white p-6 shadow-navy">
              <h3 className="text-lg font-bold text-navy mb-4">ขออนุญาตทำโอที</h3>

              {otMessage && (
                <div className={`mb-4 rounded-lg p-3 text-sm border ${
                  otMessage.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  {otMessage.text}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-navy/70 mb-1">วันที่</label>
                  <input
                    type="date"
                    value={otDate}
                    onChange={(e) => setOtDate(e.target.value)}
                    className="w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-navy/70 mb-1">เวลาเริ่ม</label>
                    <input
                      type="time"
                      value={otStart}
                      onChange={(e) => setOtStart(e.target.value)}
                      className="w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy/70 mb-1">เวลาสิ้นสุด</label>
                    <input
                      type="time"
                      value={otEnd}
                      onChange={(e) => setOtEnd(e.target.value)}
                      className="w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy/70 mb-1">เหตุผล</label>
                  <textarea
                    value={otReason}
                    onChange={(e) => setOtReason(e.target.value)}
                    rows={3}
                    placeholder="กรอกเหตุผลที่ขอทำโอที..."
                    className="w-full rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 resize-none"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => { setShowOtForm(false); setOtMessage(null); }}
                  className="flex-1 rounded-lg border border-cream-dark px-4 py-2.5 text-sm font-medium text-navy/70 hover:bg-cream transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleOtSubmit}
                  disabled={otLoading || !otReason.trim()}
                  className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {otLoading ? "กำลังส่ง..." : "ส่งคำขอ"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Modal */}
        {showStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl border border-cream-dark bg-white shadow-navy max-h-[85vh] overflow-hidden flex flex-col">
              <div className="gradient-navy px-5 py-4 flex items-center justify-between flex-shrink-0">
                <h3 className="text-base font-semibold text-white">สถิติของฉัน</h3>
                <button
                  onClick={() => { setShowStats(false); setStatsData(null); }}
                  className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto p-5">
                {loadingStats ? (
                  <div className="text-center py-8 text-navy/40">กำลังโหลด...</div>
                ) : statsData ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-navy">{statsData.employee.name}</p>
                      <p className="text-xs text-navy/40">
                        {statsData.employee.employeeCode && <span className="mr-1">{statsData.employee.employeeCode}</span>}
                        {statsData.employee.department || `กลุ่ม ${statsData.employee.groupType}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-center">
                        <div className="text-lg font-bold text-blue-600">{statsData.summary.totalDays}</div>
                        <div className="text-[9px] text-blue-500">วันรวม</div>
                      </div>
                      <div className="rounded-lg bg-green-50 border border-green-200 p-2 text-center">
                        <div className="text-lg font-bold text-green-600">{statsData.summary.onTimeDays}</div>
                        <div className="text-[9px] text-green-500">ตรงเวลา</div>
                      </div>
                      <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-center">
                        <div className="text-lg font-bold text-red-600">{statsData.summary.lateDays}</div>
                        <div className="text-[9px] text-red-500">สาย</div>
                      </div>
                      <div className="rounded-lg bg-orange-50 border border-orange-200 p-2 text-center">
                        <div className="text-lg font-bold text-orange-600">{statsData.summary.monthTotal}</div>
                        <div className="text-[9px] text-orange-500">เดือนนี้</div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-navy/50 mb-2">ประวัติเข้างาน 14 วันล่าสุด</p>
                      <div className="space-y-1.5">
                        {statsData.recentRecords.map((r: any, i: number) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-cream/50 px-3 py-2 text-xs">
                            <span className="text-navy/70">{r.date}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-navy/60">{r.checkIn || "-"}</span>
                              <span className="text-navy/30">→</span>
                              <span className="text-navy/60">{r.checkOut || "-"}</span>
                              <span className={`font-medium ${r.status === "late" ? "text-red-600" : r.status === "on_time" ? "text-green-600" : "text-navy/30"}`}>
                                {r.status === "late" ? "สาย" : r.status === "on_time" ? "✓" : "-"}
                              </span>
                            </div>
                          </div>
                        ))}
                        {statsData.recentRecords.length === 0 && (
                          <p className="text-center text-xs text-navy/30 py-4">ยังไม่มีประวัติ</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-navy/40">ไม่สามารถโหลดข้อมูลได้</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-sm text-navy/50">กำลังโหลด...</div>
      </div>
    }>
      <CheckinContent />
    </Suspense>
  );
}
