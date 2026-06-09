import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { db } from "@/db/client";
import { carriers, callEvents } from "@/db/schema";
import { getSettings } from "@/config/env";
import { verifyCarrier, getDemoCarrierIfApplicable } from "@/services/carriers";
import { getRuntimeSettings } from "@/services/settings";
import { carrierVerifySchema } from "@/lib/validators";

function isCacheFresh(verifiedAt: Date, ttlHours: number) {
  const age = Date.now() - verifiedAt.getTime();
  return age < ttlHours * 3600000;
}

export async function POST(request: NextRequest) {
  try {
    const body = carrierVerifySchema.parse(await request.json());
    const settings = getSettings();
  const rc = await getRuntimeSettings();
  const ttl = (rc.carrier_cache_ttl_hours as number) ?? settings.carrierCacheTtlHours;

  const mc = String(body.mc_number ?? "")
    .trim()
    .toUpperCase()
    .replace(/MC/g, "")
    .replace(/-/g, "")
    .trim();

  const demoCarrier = getDemoCarrierIfApplicable(mc);
  if (demoCarrier) {
    if (body.call_id) {
      await db.insert(callEvents).values({
        callId: body.call_id,
        eventType: "carrier_verify",
        payload: {
          mc_number: demoCarrier.mc_number,
          legal_name: demoCarrier.legal_name,
          is_eligible: demoCarrier.is_eligible,
          reason: demoCarrier.eligibility_reason,
        },
      });
    }
    return NextResponse.json(demoCarrier);
  }

  const [cached] = await db.select().from(carriers).where(eq(carriers.mcNumber, mc)).limit(1);

  if (cached?.verifiedAt && cached.legalName && isCacheFresh(cached.verifiedAt, ttl)) {
    const isEligible =
      cached.allowedToOperate === "Y" && (cached.operatingStatus ?? "").toUpperCase() === "ACTIVE";
    const reason = isEligible
      ? "Carrier is authorized to operate"
      : `Carrier status: ${cached.operatingStatus}`;

    if (body.call_id) {
      await db.insert(callEvents).values({
        callId: body.call_id,
        eventType: "carrier_verify",
        payload: {
          mc_number: cached.mcNumber,
          legal_name: cached.legalName,
          is_eligible: isEligible,
          reason,
        },
      });
    }

    return NextResponse.json({
      mc_number: cached.mcNumber,
      legal_name: cached.legalName,
      dba_name: cached.dbaName,
      dot_number: cached.dotNumber,
      entity_type: cached.entityType,
      operating_status: cached.operatingStatus,
      allowed_to_operate: cached.allowedToOperate,
      phone: cached.phone,
      total_drivers: cached.totalDrivers,
      total_power_units: cached.totalPowerUnits,
      is_eligible: isEligible,
      eligibility_reason: reason,
    });
  }

  const fmcsaData = await verifyCarrier(mc);

  if (cached) {
    await db
      .update(carriers)
      .set({
        legalName: fmcsaData.legal_name,
        dbaName: fmcsaData.dba_name,
        dotNumber: fmcsaData.dot_number,
        entityType: fmcsaData.entity_type,
        operatingStatus: fmcsaData.operating_status,
        allowedToOperate: fmcsaData.allowed_to_operate,
        phone: fmcsaData.phone,
        totalDrivers: fmcsaData.total_drivers,
        totalPowerUnits: fmcsaData.total_power_units,
        verifiedAt: new Date(),
      })
      .where(eq(carriers.id, cached.id));
  } else {
    await db.insert(carriers).values({
      mcNumber: mc,
      legalName: fmcsaData.legal_name,
      dbaName: fmcsaData.dba_name,
      dotNumber: fmcsaData.dot_number,
      entityType: fmcsaData.entity_type,
      operatingStatus: fmcsaData.operating_status,
      allowedToOperate: fmcsaData.allowed_to_operate,
      phone: fmcsaData.phone,
      totalDrivers: fmcsaData.total_drivers,
      totalPowerUnits: fmcsaData.total_power_units,
      verifiedAt: new Date(),
    });
  }

  if (body.call_id) {
    await db.insert(callEvents).values({
      callId: body.call_id,
      eventType: "carrier_verify",
      payload: {
        mc_number: mc,
        legal_name: fmcsaData.legal_name,
        is_eligible: fmcsaData.is_eligible,
        reason: fmcsaData.eligibility_reason,
      },
    });
  }

  return NextResponse.json(fmcsaData);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ detail: err.flatten() }, { status: 400 });
    }
    throw err;
  }
}
