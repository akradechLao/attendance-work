import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    let where: any = {};

    if (session.role === "employee" && session.companyId) {
      where.companyId = session.companyId;
    }

    if (startDate && endDate) {
      where.workDate = { gte: startDate, lte: endDate };
    } else {
      const today = new Date().toISOString().split("T")[0];
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      where.workDate = {
        gte: startOfWeek.toISOString().split("T")[0],
        lte: endOfWeek.toISOString().split("T")[0],
      };
    }

    const shifts = await prisma.shiftSchedule.findMany({
      where,
      include: { employee: true },
      orderBy: [{ workDate: "asc" }, { employee: { name: "asc" } }],
    });

    const data = shifts.map((s) => ({
      id: s.id,
      empId: s.empId,
      employeeName: s.employee.name,
      groupType: s.employee.groupType,
      workDate: s.workDate,
      shiftCode: s.shiftCode,
      dayType: s.dayType,
    }));

    return NextResponse.json({ success: true, data });
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
    const { action, weekStart, companyId } = body;

    const targetCompanyId = companyId || session.companyId;

    if (action === "auto-book-weekdays" && weekStart) {
      const where: any = {};
      if (targetCompanyId) where.companyId = targetCompanyId;

      const employees = await prisma.employee.findMany({
        where,
        select: { id: true, groupType: true, companyId: true },
      });

      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const dayOfWeek = d.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          dates.push(d.toISOString().split("T")[0]);
        }
      }

      let count = 0;
      for (const emp of employees) {
        for (const date of dates) {
          const existing = await prisma.shiftSchedule.findUnique({
            where: { empId_workDate: { empId: emp.id, workDate: date } },
          });
          if (!existing) {
            await prisma.shiftSchedule.create({
              data: {
                companyId: emp.companyId,
                empId: emp.id,
                workDate: date,
                shiftCode: "WC0002",
                dayType: "working",
              },
            });
            count++;
          }
        }
      }

      return NextResponse.json({ success: true, message: `บุ๊ควันทำงาน ${count} รายการสำเร็จ` });
    }

    if (action === "toggle-weekend" && body.empId && body.workDate) {
      const { empId, workDate, shiftCode } = body;
      const existing = await prisma.shiftSchedule.findUnique({
        where: { empId_workDate: { empId, workDate } },
      });

      if (shiftCode === "off") {
        if (existing) {
          await prisma.shiftSchedule.delete({
            where: { empId_workDate: { empId, workDate } },
          });
        }
        return NextResponse.json({ success: true, message: "ลบเวรวันหยุดสำเร็จ" });
      }

      if (existing) {
        await prisma.shiftSchedule.update({
          where: { empId_workDate: { empId, workDate } },
          data: { shiftCode: shiftCode || "WC0002" },
        });
      } else {
        const emp = await prisma.employee.findUnique({ where: { id: empId } });
        await prisma.shiftSchedule.create({
          data: {
            companyId: emp?.companyId || targetCompanyId || 1,
            empId,
            workDate,
            shiftCode: shiftCode || "WC0002",
            dayType: "working",
          },
        });
      }

      return NextResponse.json({ success: true, message: "อัพเดทเวรสำเร็จ" });
    }

    return NextResponse.json({ success: false, message: "คำขอไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
