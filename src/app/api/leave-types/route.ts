import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const where: any = { isActive: true };
    if (session.role === "employee" && session.companyId) {
      where.companyId = session.companyId;
    }

    const types = await prisma.leaveType.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        advanceDays: true,
        quotaMonthly: true,
        quotaDaily: true,
        quotaContract: true,
      },
    });

    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
