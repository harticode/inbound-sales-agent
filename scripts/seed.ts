import { eq } from "drizzle-orm";
import { db, pool } from "../db/client";
import { loads, carriers, calls } from "../db/schema";
import { LOADS_DATA, SAMPLE_CALLS_DATA } from "../db/seed-data";

async function seed() {
  const existing = await db.select().from(loads).limit(1);
  if (existing.length > 0) {
    console.log("Seed skipped — data already exists");
    await pool.end();
    return;
  }

  for (const load of LOADS_DATA) {
    await db.insert(loads).values(load);
  }

  const carriersMap = new Map<string, number>();
  for (const callData of SAMPLE_CALLS_DATA) {
    const mc = callData.carrierMcNumber;
    if (!carriersMap.has(mc)) {
      const [carrier] = await db
        .insert(carriers)
        .values({
          mcNumber: mc,
          legalName: callData.carrierName,
          operatingStatus: "AUTHORIZED",
          allowedToOperate: "Y",
        })
        .returning();
      carriersMap.set(mc, carrier.id);
    }
  }

  for (const callData of SAMPLE_CALLS_DATA) {
    const carrierId = carriersMap.get(callData.carrierMcNumber);
    let loadDbId: number | undefined;
    if (callData.loadboardRate) {
      const [load] = await db
        .select()
        .from(loads)
        .where(eq(loads.loadboardRate, callData.loadboardRate))
        .limit(1);
      loadDbId = load?.id;
    }

    const baseDate = new Date("2026-04-05T12:00:00Z");
    const offsetMs =
      (Math.floor(Math.random() * 5) * 86400000) +
      (Math.floor(Math.random() * 11 + 8) * 3600000) +
      Math.floor(Math.random() * 3600000);
    const startedAt = new Date(baseDate.getTime() + offsetMs);

    await db.insert(calls).values({
      callId: callData.callId,
      carrierId,
      loadId: loadDbId,
      carrierMcNumber: callData.carrierMcNumber,
      carrierName: callData.carrierName,
      callerName: callData.callerName,
      originRequested: callData.originRequested,
      destinationRequested: callData.destinationRequested,
      equipmentRequested: callData.equipmentRequested,
      loadboardRate: callData.loadboardRate,
      initialOffer: callData.initialOffer,
      finalAgreedRate: callData.finalAgreedRate,
      counterOffers: callData.counterOffers,
      negotiationRounds: callData.negotiationRounds,
      outcome: callData.outcome,
      sentiment: callData.sentiment,
      callDurationSeconds: callData.callDurationSeconds,
      notes: callData.notes,
      extractedData: callData.extractedData,
      transcriptSummary: callData.transcriptSummary,
      startedAt,
      endedAt: new Date(startedAt.getTime() + (callData.callDurationSeconds ?? 0) * 1000),
      createdAt: startedAt,
    });
  }

  console.log("Seed complete");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
