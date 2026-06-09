import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/config/env";

export const dynamic = "force-dynamic";

const HR_BASE = "https://platform.happyrobot.ai/api/v2";

export async function GET(request: NextRequest) {
  const settings = getSettings();
  if (!settings.happyrobotApiKey) {
    return NextResponse.json({ error: "HAPPYROBOT_API_KEY not configured" });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({
      error: "session_id is required. Call /api/events/transcript/session first.",
    });
  }

  const upstream = await fetch(
    `${HR_BASE}/sessions/${encodeURIComponent(sessionId)}/stream?backfillLimit=1000`,
    {
      headers: { Authorization: `Bearer ${settings.happyrobotApiKey}` },
      signal: AbortSignal.timeout(300000),
    },
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `HappyRobot returned ${upstream.status}` },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
