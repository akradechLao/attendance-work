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

    // ETECH first for login priority
    const sorted = [...companies].sort((a, b) => {
      if (a.name === "ETECH") return -1;
      if (b.name === "ETECH") return 1;
      return a.id - b.id;
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
