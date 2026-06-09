import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { callEvents } from "@/db/schema";
import { serializeCallEvent } from "@/db/serializers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  const events = await db
    .select()
    .from(callEvents)
    .where(eq(callEvents.callId, callId))
    .orderBy(callEvents.createdAt);
  return NextResponse.json(events.map(serializeCallEvent));
}
