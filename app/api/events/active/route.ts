import { NextResponse } from "next/server";
import { getActiveCalls } from "@/services/events";

export async function GET() {
  const active = await getActiveCalls();
  return NextResponse.json(active);
}
