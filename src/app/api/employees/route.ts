import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const where: any = {};
    if (session.role === "employee" && session.companyId) {
      where.companyId = session.companyId;
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        groupType: true,
        wfhQuota: true,
        preferredOffDay: true,
        companyId: true,
        employeeCode: true,
      },
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, groupType, preferredOffDay, companyId, employeeCode, pin } = body;

    if (!name || !groupType) {
      return NextResponse.json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    const targetCompanyId = companyId || session.companyId || 1;

    const employee = await prisma.employee.create({
      data: {
        companyId: targetCompanyId,
        name,
        groupType,
        wfhQuota: 1,
        preferredOffDay: preferredOffDay || null,
        employeeCode: employeeCode || null,
        pin: pin || "1234",
      },
    });

    return NextResponse.json({ success: true, message: "เพิ่มพนักงานสำเร็จ", data: employee });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, groupType, preferredOffDay, employeeCode, pin } = body;

    if (!id || !name || !groupType) {
      return NextResponse.json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        groupType,
        preferredOffDay: preferredOffDay || null,
        employeeCode: employeeCode || null,
        ...(pin && { pin }),
      },
    });

    return NextResponse.json({ success: true, message: "แก้ไขพนักงานสำเร็จ", data: employee });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ success: false, message: "ไม่พบรหัสพนักงาน" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.attendanceLog.deleteMany({ where: { empId: id } }),
      prisma.shiftSchedule.deleteMany({ where: { empId: id } }),
      prisma.leaveRequest.deleteMany({ where: { empId: id } }),
      prisma.wfhRecord.deleteMany({ where: { empId: id } }),
      prisma.onboardingRecord.deleteMany({ where: { empId: id } }),
      prisma.employee.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, message: "ลบพนักงานสำเร็จ" });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
