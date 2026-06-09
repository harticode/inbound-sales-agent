import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "./env";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function verifyApiKey(request: NextRequest): NextResponse | null {
  const settings = getSettings();
  if (!settings.apiKey) return null;

  const provided = request.headers.get("x-api-key") ?? "";
  if (!timingSafeEqual(provided, settings.apiKey)) {
    return NextResponse.json({ detail: "Invalid or missing API key" }, { status: 401 });
  }
  return null;
}

function isDashboardRequest(request: NextRequest): boolean {
  const settings = getSettings();
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (origin) {
    return settings.allowedOrigins.some((o) => origin.startsWith(o)) || origin.includes(host ?? "");
  }
  if (referer && host) {
    return referer.includes(host);
  }
  return false;
}

const DASHBOARD_WRITE_PATHS = new Set([
  "/api/voice/token",
  "/api/events/call-started",
  "/api/events/call-ended",
  "/api/negotiate",
  "/api/settings",
  "/api/settings/reset",
]);

export function requireApiKeyUnlessDashboard(request: NextRequest): NextResponse | null {
  if (request.method === "GET" && isDashboardRequest(request)) {
    return null;
  }
  if (isDashboardRequest(request) && DASHBOARD_WRITE_PATHS.has(request.nextUrl.pathname)) {
    return null;
  }
  return verifyApiKey(request);
}
