import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { loads } from "@/db/schema";
import { searchLoadsDashboard } from "@/services/loads";
import { serializeLoad } from "@/db/serializers";

function parseSearchParams(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  return {
    origin: sp.get("origin"),
    destination: sp.get("destination"),
    equipmentType: sp.get("equipment_type"),
    minRate: sp.get("min_rate") ? parseFloat(sp.get("min_rate")!) : null,
    maxWeight: sp.get("max_weight") ? parseFloat(sp.get("max_weight")!) : null,
    pickupDate: sp.get("pickup_date"),
  };
}

export async function GET(request: NextRequest) {
  const result = await searchLoadsDashboard(parseSearchParams(request));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const existing = await db.select().from(loads).where(eq(loads.loadId, body.load_id)).limit(1);
  if (existing.length) {
    return NextResponse.json({ detail: `Load ${body.load_id} already exists` }, { status: 409 });
  }

  const [created] = await db
    .insert(loads)
    .values({
      loadId: body.load_id,
      origin: body.origin,
      destination: body.destination,
      pickupDatetime: new Date(body.pickup_datetime),
      deliveryDatetime: new Date(body.delivery_datetime),
      equipmentType: body.equipment_type,
      loadboardRate: body.loadboard_rate,
      notes: body.notes ?? "",
      weight: body.weight,
      commodityType: body.commodity_type ?? "",
      numOfPieces: body.num_of_pieces,
      miles: body.miles,
      dimensions: body.dimensions ?? "",
    })
    .returning();

  return NextResponse.json(await serializeLoad(created, true), { status: 201 });
}
