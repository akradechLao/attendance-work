import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, employeeCode } = body;

    if (!companyId || !employeeCode) {
      return NextResponse.json(
        { success: false, message: "ข้อมูลไม่ครบถ้วน" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        companyId: Number(companyId),
        employeeCode,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "ไม่พบพนักงานในระบบ" },
        { status: 401 }
      );
    }

    await createSession({
      userId: employee.id,
      role: "employee",
      companyId: employee.companyId,
    });

    return NextResponse.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
        groupType: employee.groupType,
      },
      redirect: "/employee?qr=1",
    });
  } catch (error) {
    console.error("QR login error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
