"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { checkIn, checkOut } from "@/lib/attendance/actions";

interface Employee {
  id: number;
  name: string;
  employeeCode: string | null;
  groupType: string;
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
              <p className="mt-2 text-sm text-navy/60">
                {employee.employeeCode && <span className="mr-1">{employee.employeeCode}</span>}
                {employee.name}
              </p>
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
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
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
            <p className="mt-1 text-sm text-navy/60">
              {employee.employeeCode && <span className="mr-1">{employee.employeeCode}</span>}
              {employee.name}
            </p>
          )}
        </div>

        {showCamera && !capturedPhoto && (
          <div>
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
          <div>
            <img
              src={capturedPhoto}
              alt="Captured"
              className="mx-auto w-full max-w-xs rounded-xl object-cover border-2 border-green-400 shadow-gold"
            />
            <p className="mt-3 text-sm text-green-600 font-medium animate-pulse">
              {submitting ? "กำลังบันทึก..." : "บันทึกสำเร็จ"}
            </p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        <button
          onClick={() => window.location.href = "/login"}
          className="mt-6 text-sm text-navy/40 hover:text-navy/60 transition-colors"
        >
          ยกเลิก
        </button>
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
