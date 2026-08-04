import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approvedBy, role } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "กรุณาระบุข้อมูลให้ครบ" },
        { status: 400 }
      );
    }

    // role: "manager" = หัวหน้าอนุมัติ, "hr" = HR/payroll อนุมัติสุดท้าย
    const validStatuses = role === "hr"
      ? ["approved", "rejected"]
      : ["manager_approved", "rejected"];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: "สถานะไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const otRequest = await prisma.otRequest.findUnique({
      where: { id: Number(id) },
      include: { employee: { select: { name: true, employeeCode: true, department: true, companyId: true } } },
    });

    if (!otRequest) {
      return NextResponse.json(
        { success: false, message: "ไม่พบคำขอโอที" },
        { status: 404 }
      );
    }

    // Validate status transition
    if (role === "manager" && otRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "คำขอโอทีนี้ได้รับการดำเนินการแล้ว" },
        { status: 400 }
      );
    }

    if (role === "hr" && otRequest.status !== "manager_approved") {
      return NextResponse.json(
        { success: false, message: "ต้องได้รับการอนุมัติจากหัวหน้าก่อน" },
        { status: 400 }
      );
    }

    const newStatus = status === "rejected" ? "rejected" : status;

    await prisma.otRequest.update({
      where: { id: Number(id) },
      data: {
        status: newStatus,
        approvedBy: approvedBy || (role === "hr" ? "HR/Payroll" : "Manager"),
        approvedAt: new Date(),
      },
    });

    const empDisplay = otRequest.employee.employeeCode
      ? `${otRequest.employee.employeeCode} ${otRequest.employee.name}`
      : otRequest.employee.name;

    const statusText = status === "rejected" ? "ปฏิเสธ"
      : status === "manager_approved" ? "หัวหน้าอนุมัติ"
      : "HR/Payroll อนุมัติสุดท้าย";

    try {
      sendTelegramMessage(
        `✅ <b>โอที${statusText}</b>\nพนักงาน: ${empDisplay}\nวันที่: ${otRequest.date}\nเวลา: ${otRequest.startTime} - ${otRequest.endTime}\nโดย: ${approvedBy || (role === "hr" ? "HR/Payroll" : "Manager")}`
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
