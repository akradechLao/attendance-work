import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empId, companyId, date, startTime, endTime, reason } = body;

    if (!empId || !companyId || !date || !startTime || !endTime || !reason) {
      return NextResponse.json(
        { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: Number(empId) },
      select: { name: true, employeeCode: true, department: true, companyId: true },
    });

    if (!employee || employee.companyId !== Number(companyId)) {
      return NextResponse.json(
        { success: false, message: "ไม่พบข้อมูลพนักงาน" },
        { status: 404 }
      );
    }

    const otRequest = await prisma.otRequest.create({
      data: {
        companyId: Number(companyId),
        empId: Number(empId),
        date,
        startTime,
        endTime,
        reason,
        status: "pending",
      },
    });

    const empDisplay = employee.employeeCode
      ? `${employee.employeeCode} ${employee.name}`
      : employee.name;
    const deptDisplay = employee.department ? ` (${employee.department})` : "";

    try {
      sendTelegramMessage(
        `📋 <b>ขอโอทีใหม่</b>\nพนักงาน: ${empDisplay}${deptDisplay}\nวันที่: ${date}\nเวลา: ${startTime} - ${endTime}\nเหตุผล: ${reason}`
      );
    } catch {}

    return NextResponse.json({
      success: true,
      message: "ส่งคำขอโอทีสำเร็จ รอหัวหน้าอนุมัติ",
      data: otRequest,
    });
  } catch (error) {
    console.error("OT request error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
