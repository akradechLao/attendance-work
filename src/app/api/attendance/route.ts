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
    const date = searchParams.get("date");
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    const where: any = {};
    if (session.role === "employee" && session.companyId) {
      where.employee = { companyId: session.companyId };
    }

    let records;

    if (date) {
      records = await prisma.attendanceLog.findMany({
        where: { ...where, date },
        include: { employee: true },
        orderBy: { checkIn: "asc" },
      });
    } else if (startDate && endDate) {
      records = await prisma.attendanceLog.findMany({
        where: {
          ...where,
          date: { gte: startDate, lte: endDate },
        },
        include: { employee: true },
        orderBy: [{ date: "asc" }, { checkIn: "asc" }],
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      records = await prisma.attendanceLog.findMany({
        where: { ...where, date: today },
        include: { employee: true },
        orderBy: { checkIn: "asc" },
      });
    }

    const data = records.map((r) => ({
      id: r.id,
      employeeName: r.employee.name,
      groupType: r.employee.groupType,
      date: r.date,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
      latLong: r.latLong,
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
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.action === "wfh-usage") {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const where: any = {
        date: { startsWith: month },
        status: { not: "rejected" },
      };

      if (session.role === "employee" && session.companyId) {
        where.employee = { companyId: session.companyId };
      }

      const records = await prisma.wfhRecord.findMany({
        where,
        select: { empId: true },
      });
      const usage: Record<number, number> = {};
      for (const r of records) {
        usage[r.empId] = (usage[r.empId] || 0) + 1;
      }
      return NextResponse.json({ success: true, data: usage });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
