import { NextRequest, NextResponse } from "next/server";
import { getTranscriptSession } from "@/services/events";

export async function GET(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get("call_id") ?? undefined;
  const result = await getTranscriptSession(callId);
  return NextResponse.json(result);
}
