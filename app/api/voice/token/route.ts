import { NextRequest, NextResponse } from "next/server";
import { createVoiceToken } from "@/services/voice";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = await createVoiceToken(
      typeof body.data === "object" && body.data !== null
        ? (body.data as Record<string, unknown>)
        : undefined,
    );
    return NextResponse.json(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create voice token";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
