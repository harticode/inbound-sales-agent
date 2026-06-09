import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleCallEnded } from "@/services/events";
import { callEndedSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = callEndedSchema.parse(await request.json().catch(() => ({})));
    const result = await handleCallEnded(body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ detail: err.flatten() }, { status: 400 });
    }
    throw err;
  }
}
