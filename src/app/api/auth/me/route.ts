import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }

  let companyName: string | undefined;

  if (session.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
    });
    companyName = company?.name;
  }

  return NextResponse.json({
    loggedIn: true,
    role: session.role,
    companyId: session.companyId,
    companyName,
    userId: session.userId,
  });
}
