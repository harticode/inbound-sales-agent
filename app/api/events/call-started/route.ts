import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { handleCallStarted } from "@/services/events";
import { callStartedSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = callStartedSchema.parse(await request.json().catch(() => ({})));
    const result = await handleCallStarted(body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ detail: err.flatten() }, { status: 400 });
    }
    throw err;
  }
}
