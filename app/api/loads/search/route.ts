import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { searchLoadsAgent } from "@/services/loads";
import { loadSearchSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const params = loadSearchSchema.parse({
      origin: sp.get("origin"),
      destination: sp.get("destination"),
      equipment_type: sp.get("equipment_type"),
      min_rate: sp.get("min_rate"),
      max_weight: sp.get("max_weight"),
      pickup_date: sp.get("pickup_date"),
      call_id: sp.get("call_id") ?? "",
    });

    const result = await searchLoadsAgent({
      origin: params.origin,
      destination: params.destination,
      equipmentType: params.equipment_type,
      minRate: params.min_rate ? parseFloat(String(params.min_rate)) : null,
      maxWeight: params.max_weight ? parseFloat(String(params.max_weight)) : null,
      pickupDate: params.pickup_date,
      callId: params.call_id ?? "",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ detail: err.flatten() }, { status: 400 });
    }
    throw err;
  }
}
