import { NextRequest, NextResponse } from "next/server";
import { getMetrics } from "@/services/metrics";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "all";
  const metrics = await getMetrics(period);
  return NextResponse.json(metrics);
}
