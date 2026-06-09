import { NextResponse } from "next/server";
import { resetRuntimeSettings } from "@/services/settings";

export async function POST() {
  const effective = await resetRuntimeSettings();
  return NextResponse.json({ values: effective });
}
