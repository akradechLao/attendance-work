import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "session_token";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hr-attendance-secret-2024"
);

export interface SessionData {
  userId: number;
  role: "admin" | "employee";
  companyId?: number;
}

export async function createSession(data: SessionData): Promise<void> {
  const token = await new SignJWT(data as any)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  return session;
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role !== "admin") throw new Error("Not authorized");
  return session;
}

export async function getCompanyIdFromSession(): Promise<number | undefined> {
  const session = await getSession();
  if (!session) return undefined;
  if (session.role === "admin") return undefined;
  return session.companyId;
}
