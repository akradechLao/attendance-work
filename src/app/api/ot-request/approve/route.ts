import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approvedBy } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "กรุณาระบุข้อมูลให้ครบ" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "สถานะไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const otRequest = await prisma.otRequest.findUnique({
      where: { id: Number(id) },
      include: { employee: { select: { name: true, employeeCode: true, department: true } } },
    });

    if (!otRequest) {
      return NextResponse.json(
        { success: false, message: "ไม่พบคำขอโอที" },
        { status: 404 }
      );
    }

    await prisma.otRequest.update({
      where: { id: Number(id) },
      data: {
        status,
        approvedBy: approvedBy || "Admin",
        approvedAt: new Date(),
      },
    });

    const empDisplay = otRequest.employee.employeeCode
      ? `${otRequest.employee.employeeCode} ${otRequest.employee.name}`
      : otRequest.employee.name;
    const statusText = status === "approved" ? "อนุมัติ" : "ปฏิเสธ";

    try {
      sendTelegramMessage(
        `✅ <b>โอที${statusText}</b>\nพนักงาน: ${empDisplay}\nวันที่: ${otRequest.date}\nเวลา: ${otRequest.startTime} - ${otRequest.endTime}\nโดย: ${approvedBy || "Admin"}`
      );
    } catch {}

    return NextResponse.json({
      success: true,
      message: `${statusText}คำขอโอทีสำเร็จ`,
    });
  } catch (error) {
    console.error("Approve OT error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
