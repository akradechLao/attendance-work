import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export function verifyApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey === process.env.API_KEY) return null;
  return null;
}

export async function requireAuth(request: NextRequest): Promise<{ session: any; error?: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return { session: null, error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}
