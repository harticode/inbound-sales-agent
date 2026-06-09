import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { loads } from "@/db/schema";
import { serializeLoad } from "@/db/serializers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ loadId: string }> },
) {
  const { loadId } = await params;
  const [load] = await db.select().from(loads).where(eq(loads.loadId, loadId)).limit(1);
  if (!load) {
    return NextResponse.json({ detail: `Load ${loadId} not found` }, { status: 404 });
  }
  return NextResponse.json(await serializeLoad(load, true));
}
