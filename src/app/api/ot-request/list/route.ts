import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const status = searchParams.get("status") || "pending";

    if (!companyId) {
      return NextResponse.json({ success: false, message: "กรุณาระบุ companyId" }, { status: 400 });
    }

    const otRequests = await prisma.otRequest.findMany({
      where: {
        companyId: Number(companyId),
        status,
      },
      include: {
        employee: {
          select: { name: true, employeeCode: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: otRequests });
  } catch (error) {
    console.error("Fetch OT requests error:", error);
    return NextResponse.json(
      { success: false, message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
