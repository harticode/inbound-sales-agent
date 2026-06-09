import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { listCalls, createOrUpdateCall } from "@/services/calls";
import { createOrUpdateCallSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const calls = await listCalls({
    limit: parseInt(sp.get("limit") ?? "50", 10),
    offset: parseInt(sp.get("offset") ?? "0", 10),
    outcome: sp.get("outcome"),
    sentiment: sp.get("sentiment"),
  });
  return NextResponse.json(calls);
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
    console.log("createOrUpdateCall", raw);
    const body = createOrUpdateCallSchema.parse(raw);
    const { call, status } = await createOrUpdateCall(body);
    return NextResponse.json(call, { status });
  } catch (err) {
    if (err instanceof ZodError) {
      console.error("createOrUpdateCall validation failed", {
        call_id: (raw as Record<string, unknown> | undefined)?.call_id,
        errors: err.flatten(),
      });
      return NextResponse.json({ detail: err.flatten() }, { status: 400 });
    }
    throw err;
  }
}
