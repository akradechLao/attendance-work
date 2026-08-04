import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const q = searchParams.get("q") || "";

    if (!companyId) {
      return NextResponse.json({ success: false, message: "กรุณาเลือกบริษัท" }, { status: 400 });
    }

    const where: any = { companyId: Number(companyId) };

    if (q.trim()) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { employeeCode: { contains: q, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        employeeCode: true,
        groupType: true,
        department: true,
      },
      orderBy: { name: "asc" },
      take: 20,
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
