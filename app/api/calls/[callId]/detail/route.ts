import { NextResponse } from "next/server";
import { getCallDetail } from "@/services/calls";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  const detail = await getCallDetail(callId);
  if (!detail) {
    return NextResponse.json({ detail: `Call ${callId} not found` }, { status: 404 });
  }
  return NextResponse.json(detail);
}
