"use client";

import { useState, useRef } from "react";
import QRCode from "qrcode";

interface Employee {
  id: number;
  name: string;
  employeeCode: string | null;
  companyId: number;
  company?: { name: string };
}

interface QrGeneratorProps {
  employees: Employee[];
  onClose: () => void;
}

export default function QrGenerator({ employees, onClose }: QrGeneratorProps) {
  const [qrImages, setQrImages] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function generateAll() {
    setGenerating(true);
    const images: Record<number, string> = {};

    for (const emp of employees) {
      if (!emp.employeeCode || !emp.companyId) continue;
      const qrData = `${emp.companyId}:${emp.employeeCode}`;
      try {
        const dataUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        images[emp.id] = dataUrl;
      } catch {
        console.error("QR gen failed for", emp.name);
      }
    }

    setQrImages(images);
    setGenerating(false);
  }

  function handlePrint() {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>QR Code Cards</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .card { border: 1px solid #ccc; border-radius: 8px; padding: 12px; text-align: center; page-break-inside: avoid; }
            .card img { width: 120px; height: 120px; }
            .card h3 { font-size: 12px; margin: 8px 0 2px; }
            .card p { font-size: 10px; color: #666; margin: 0; }
            @media print { .card { border: 1px solid #000; } }
          </style>
        </head>
        <body>
          <h2 style="text-align:center;margin-bottom:16px">QR Code Cards - Check-in</h2>
          <div class="grid">
            ${employees
              .filter((emp) => qrImages[emp.id])
              .map(
                (emp) => `
              <div class="card">
                <img src="${qrImages[emp.id]}" alt="QR" />
                <h3>${emp.name}</h3>
                <p>${emp.employeeCode || "-"} | ${emp.company?.name || ""}</p>
                <p style="font-size:9px;color:#999;margin-top:4px">${emp.companyId}:${emp.employeeCode}</p>
              </div>
            `
              )
              .join("")}
          </div>
          <script>window.onload=function(){window.print();}</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-cream-dark bg-white shadow-navy max-h-[90vh] flex flex-col">
        <div className="gradient-navy px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="text-base font-semibold text-white">QR Code เช็คอิน</h3>
          <button onClick={onClose} className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-cream-dark flex-shrink-0">
          <button
            onClick={generateAll}
            disabled={generating}
            className="rounded-lg gradient-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
          >
            {generating ? "กำลังสร้าง QR..." : "สร้าง QR Code ทั้งหมด"}
          </button>
          {Object.keys(qrImages).length > 0 && (
            <button
              onClick={handlePrint}
              className="rounded-lg border border-cream-dark px-4 py-2 text-sm font-medium text-navy/70 hover:bg-cream transition-colors"
            >
              พิมพ์
            </button>
          )}
          <span className="text-xs text-navy/40">{employees.length} คน</span>
        </div>

        <div ref={printRef} className="overflow-y-auto p-5 flex-1">
          {Object.keys(qrImages).length === 0 ? (
            <div className="py-12 text-center text-sm text-navy/40">
              กดปุ่ม &quot;สร้าง QR Code ทั้งหมด&quot; เพื่อสร้าง QR ให้พนักงานทุกคน
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {employees
                .filter((emp) => qrImages[emp.id])
                .map((emp) => (
                  <div key={emp.id} className="rounded-lg border border-cream-dark p-3 text-center">
                    <img src={qrImages[emp.id]} alt="QR" className="mx-auto h-32 w-32" />
                    <p className="mt-2 text-sm font-semibold text-navy truncate">{emp.name}</p>
                    <p className="text-[10px] text-navy/50">{emp.employeeCode || "-"}</p>
                    <p className="text-[10px] text-navy/40 mt-0.5">{emp.companyId}:{emp.employeeCode}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
