import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empId = searchParams.get("empId");

    if (!empId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ empId" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: Number(empId) },
      select: { id: true, name: true, employeeCode: true, groupType: true, department: true },
    });

    if (!employee) {
      return NextResponse.json({ success: false, message: "ไม่พบพนักงาน" }, { status: 404 });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const yearStart = `${now.getFullYear()}-01-01`;

    const allRecords = await prisma.attendanceLog.findMany({
      where: {
        empId: Number(empId),
        date: { gte: yearStart },
      },
      orderBy: { date: "desc" },
    });

    const monthRecords = allRecords.filter((r) => r.date.startsWith(currentMonth));

    const totalDays = allRecords.length;
    const lateDays = allRecords.filter((r) => r.status === "late").length;
    const onTimeDays = allRecords.filter((r) => r.status === "on_time").length;

    const monthLate = monthRecords.filter((r) => r.status === "late").length;
    const monthOnTime = monthRecords.filter((r) => r.status === "on_time").length;

    const recentRecords = allRecords.slice(0, 14);

    return NextResponse.json({
      success: true,
      data: {
        employee,
        summary: {
          totalDays,
          lateDays,
          onTimeDays,
          monthLate,
          monthOnTime,
          monthTotal: monthRecords.length,
        },
        recentRecords: recentRecords.map((r) => ({
          date: r.date,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          status: r.status,
        })),
      },
    });
  } catch (error) {
    console.error("Employee stats error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
