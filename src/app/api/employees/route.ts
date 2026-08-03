import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createEmployee, updateEmployee, deleteEmployee } from "@/lib/employees/actions";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const where: { companyId?: number } = {};
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

    const result = await createEmployee(name, groupType, preferredOffDay || null, {
      companyId: companyId || session.companyId || undefined,
      employeeCode: employeeCode || null,
      pin: pin || null,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
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

    const result = await updateEmployee(id, name, groupType, preferredOffDay || null, {
      employeeCode: employeeCode || null,
      pin: pin || null,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
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

    const result = await deleteEmployee(id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
