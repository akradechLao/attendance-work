import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME);
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPublicApi = pathname === "/api/companies" || pathname === "/api/employees/search";
  const isApiUpload = pathname === "/api/upload";
  const isEmployeePage = pathname.startsWith("/employee") || pathname.startsWith("/checkin") || pathname.startsWith("/supervisor") || pathname.startsWith("/manager");

  if (isApiAuth || isPublicApi || isApiUpload || isEmployeePage) {
    return NextResponse.next();
  }

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
