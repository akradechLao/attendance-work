import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empId = searchParams.get("empId");
    const department = searchParams.get("department");

    if (!empId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ empId" }, { status: 400 });
    }

    const manager = await prisma.employee.findUnique({
      where: { id: Number(empId) },
      select: { id: true, name: true, position: true, companyId: true, department: true, division: true },
    });

    if (!manager) {
      return NextResponse.json({ success: false, message: "ไม่พบข้อมูล" }, { status: 404 });
    }

    const positionHierarchy: Record<string, number> = {
      employee: 0,
      team_lead: 1,
      dept_manager: 2,
      division_manager: 3,
      assistant_md: 4,
      md: 5,
    };

    const managerLevel = positionHierarchy[manager.position] || 0;

    let whereClause: any = { companyId: manager.companyId };

    if (managerLevel >= 5) {
      if (department) whereClause.department = department;
    } else if (managerLevel >= 3) {
      whereClause.division = manager.division;
      if (department) whereClause.department = department;
    } else if (managerLevel >= 2) {
      whereClause.department = manager.department;
    } else {
      whereClause.reportsTo = manager.id;
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        employeeCode: true,
        groupType: true,
        department: true,
        division: true,
        position: true,
      },
      orderBy: { name: "asc" },
    });

    const empIds = employees.map((e) => e.id);
    const today = new Date();
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const allRecords = await prisma.attendanceLog.findMany({
      where: {
        empId: { in: empIds },
        date: { gte: `${today.getFullYear()}-01-01` },
      },
      orderBy: { date: "desc" },
    });

    const employeeStats = employees.map((emp) => {
      const empRecords = allRecords.filter((r) => r.empId === emp.id);
      const monthRecords = empRecords.filter((r) => r.date.startsWith(monthStr));
      const todayRecord = empRecords.find((r) => r.date === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);

      return {
        ...emp,
        stats: {
          totalDays: empRecords.length,
          lateDays: empRecords.filter((r) => r.status === "late").length,
          onTimeDays: empRecords.filter((r) => r.status === "on_time").length,
          monthTotal: monthRecords.length,
          monthLate: monthRecords.filter((r) => r.status === "late").length,
        },
        today: todayRecord ? {
          checkIn: todayRecord.checkIn,
          checkOut: todayRecord.checkOut,
          status: todayRecord.status,
        } : null,
      };
    });

    const departments = await prisma.employee.findMany({
      where: { companyId: manager.companyId, department: { not: null } },
      select: { department: true },
      distinct: ["department"],
    });

    const divisions = await prisma.employee.findMany({
      where: { companyId: manager.companyId, division: { not: null } },
      select: { division: true },
      distinct: ["division"],
    });

    return NextResponse.json({
      success: true,
      data: {
        manager,
        managerLevel,
        employees: employeeStats,
        departments: departments.map((d) => d.department).filter(Boolean),
        divisions: divisions.map((d) => d.division).filter(Boolean),
      },
    });
  } catch (error) {
    console.error("Manager data error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
