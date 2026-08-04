import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("[api/companies] Fetching companies...");
    const companies = await prisma.company.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
    console.log("[api/companies] Found", companies.length, "companies");

    const order = ["ETC1992", "ETECH", "STC", "NTC"];
    const sorted = [...companies].sort((a, b) => {
      const ai = order.indexOf(a.name);
      const bi = order.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return NextResponse.json({ success: true, data: sorted });
  } catch (error) {
    console.error("[api/companies] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
