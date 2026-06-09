import { NextRequest, NextResponse } from "next/server";
import { requireApiKeyUnlessDashboard } from "./config/auth";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (request.nextUrl.pathname === "/api/health") {
      return NextResponse.next();
    }
    const authError = requireApiKeyUnlessDashboard(request);
    if (authError) return authError;
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
