import { NextRequest, NextResponse } from "next/server";
import {
  KNOWN_SETTINGS,
  getRuntimeSettings,
  updateRuntimeSettings,
} from "@/services/settings";

export async function GET() {
  const effective = await getRuntimeSettings();
  const schema: Record<string, { kind: string; default: unknown }> = {};
  for (const [key, [kind, defaultVal]] of Object.entries(KNOWN_SETTINGS)) {
    schema[key] = { kind, default: defaultVal };
  }
  return NextResponse.json({ values: effective, schema });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const effective = await updateRuntimeSettings(body);
    return NextResponse.json({ values: effective });
  } catch (err) {
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Invalid settings" },
      { status: 400 },
    );
  }
}
