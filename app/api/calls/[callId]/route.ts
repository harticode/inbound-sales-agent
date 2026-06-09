import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { calls } from "@/db/schema";
import { serializeCall } from "@/db/serializers";
import { updateCall } from "@/services/calls";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  const [call] = await db.select().from(calls).where(eq(calls.callId, callId)).limit(1);
  if (!call) {
    return NextResponse.json({ detail: `Call ${callId} not found` }, { status: 404 });
  }
  return NextResponse.json(serializeCall(call));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  const body = await request.json();
  const updated = await updateCall(callId, body);
  if (!updated) {
    return NextResponse.json({ detail: `Call ${callId} not found` }, { status: 404 });
  }
  return NextResponse.json(updated);
}
