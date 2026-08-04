"use client";

import { useEffect, useRef, useState } from "react";

interface QrScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [status, setStatus] = useState<"loading" | "scanning" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const scanningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("scanning");
        scanningRef.current = true;
        scanFrame();
      } catch {
        if (!cancelled) {
          setErrorMsg("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง");
          setStatus("error");
        }
      }
    }

    function scanFrame() {
      if (!scanningRef.current || cancelled) return;

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (video && ctx && video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Use BarcodeDetector API if available
        const BD = (window as any).BarcodeDetector;
        if (BD) {
          const detector = new BD({ formats: ["qr_code"] });
          detector
            .detect(canvas)
            .then((barcodes: any[]) => {
              if (barcodes.length > 0 && scanningRef.current) {
                scanningRef.current = false;
                stopCamera();
                onScan(barcodes[0].rawValue);
                return;
              }
              animFrameRef.current = requestAnimationFrame(scanFrame);
            })
            .catch(() => {
              animFrameRef.current = requestAnimationFrame(scanFrame);
            });
        } else {
          // Fallback: no BarcodeDetector, just show camera
          animFrameRef.current = requestAnimationFrame(scanFrame);
        }
      } else {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    }

    start();

    return () => {
      cancelled = true;
      scanningRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function handleClose() {
    scanningRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    stopCamera();
    onClose();
  }

  // Manual input fallback
  function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = form.get("manualCode") as string;
    if (code.trim()) {
      scanningRef.current = false;
      stopCamera();
      onScan(code.trim());
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-4 shadow-navy">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-navy">สแกน QR Code</h3>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-navy/50 hover:bg-cream transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status === "loading" && (
          <div className="py-12 text-center text-sm text-navy/50">กำลังเปิดกล้อง...</div>
        )}

        {status === "error" && (
          <div className="py-6 text-center">
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
        )}

        {status === "scanning" && (
          <>
            <div className="relative overflow-hidden rounded-lg">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg"
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Scan overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-2xl border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-navy/50">วาง QR Code ไว้ในกรอบ</p>
          </>
        )}

        {/* Manual fallback */}
        <form onSubmit={handleManualSubmit} className="mt-4">
          <p className="mb-1 text-[10px] text-navy/40 text-center">หรือพิมพ์รหัส ( companyId:employeeCode )</p>
          <div className="flex gap-2">
            <input
              name="manualCode"
              type="text"
              placeholder="เช่น 1:NTC001"
              className="flex-1 rounded-lg border border-cream-dark bg-cream/50 px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
            <button
              type="submit"
              className="rounded-lg gradient-navy px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-md"
            >
              ไป
            </button>
          </div>
        </form>

        <button
          onClick={handleClose}
          className="mt-3 w-full rounded-lg border border-cream-dark px-4 py-2.5 text-sm font-medium text-navy/70 hover:bg-cream transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
