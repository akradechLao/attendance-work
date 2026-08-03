import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime: "netlify",
    timestamp: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT SET",
  });
}
