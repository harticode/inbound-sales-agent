import { and, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { loads, callEvents } from "@/db/schema";
import { serializeLoad } from "@/db/serializers";

function escapeLike(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchLoads(params: {
  origin?: string | null;
  destination?: string | null;
  equipmentType?: string | null;
  minRate?: number | null;
  maxWeight?: number | null;
  pickupDate?: string | null;
}) {
  const conditions = [eq(loads.status, "available")];

  if (params.origin) {
    conditions.push(ilike(loads.origin, `%${escapeLike(params.origin)}%`));
  }
  if (params.destination) {
    conditions.push(ilike(loads.destination, `%${escapeLike(params.destination)}%`));
  }
  if (params.equipmentType) {
    conditions.push(ilike(loads.equipmentType, `%${escapeLike(params.equipmentType)}%`));
  }
  if (params.minRate) {
    conditions.push(gte(loads.loadboardRate, params.minRate));
  }
  if (params.maxWeight) {
    conditions.push(lte(loads.weight, params.maxWeight));
  }
  if (params.pickupDate) {
    conditions.push(sql`date(${loads.pickupDatetime}) = ${params.pickupDate}`);
  }

  return db
    .select()
    .from(loads)
    .where(and(...conditions))
    .orderBy(loads.pickupDatetime);
}

export async function searchLoadsAgent(
  params: Parameters<typeof searchLoads>[0] & { callId?: string },
) {
  const rows = await searchLoads(params);
  const agentLoads = await Promise.all(rows.map((l) => serializeLoad(l, false)));

  if (params.callId) {
    await db.insert(callEvents).values({
      callId: params.callId,
      eventType: "load_search",
      payload: {
        origin: params.origin || "",
        destination: params.destination || "",
        equipment: params.equipmentType || "",
        equipment_type: params.equipmentType || "",
        pickup_date: params.pickupDate || "",
        min_rate: params.minRate ?? null,
        max_weight: params.maxWeight ?? null,
        results_count: agentLoads.length,
      },
    });
  }

  return { loads: agentLoads, total: agentLoads.length };
}

export async function searchLoadsDashboard(params: Parameters<typeof searchLoads>[0]) {
  const rows = await searchLoads(params);
  const responses = await Promise.all(rows.map((l) => serializeLoad(l, true)));
  return { loads: responses, total: responses.length };
}
