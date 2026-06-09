import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import { db } from "@/db/client";
import { loads, callEvents } from "@/db/schema";
import {
  evaluateOffer,
  getDemandNegotiationContext,
} from "@/services/negotiation/server";
import { negotiateSchema } from "@/lib/validators";

function parseCounter(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function previousCountersFromPayloads(payloads: Record<string, unknown>[]) {
  return payloads
    .map((payload) => parseCounter(payload.counter_offer))
    .filter((counter): counter is number => counter != null);
}

export async function POST(request: NextRequest) {
  try {
    const body = negotiateSchema.parse(await request.json());
    const [load] = await db.select().from(loads).where(eq(loads.loadId, body.load_id)).limit(1);
    if (!load) {
      return NextResponse.json({ detail: `Load ${body.load_id} not found` }, { status: 404 });
    }

    let serverRound = parseInt(String(body.current_round ?? 1), 10);
    let previousBrokerCounters =
      body.previous_broker_counters
        ?.map(parseCounter)
        .filter((counter): counter is number => counter != null) ?? [];

    if (body.call_id) {
      const negotiateEvents = await db
        .select({ payload: callEvents.payload })
        .from(callEvents)
        .where(
          and(
            eq(callEvents.callId, body.call_id),
            eq(callEvents.eventType, "negotiate"),
          ),
        );
      serverRound = negotiateEvents.length + 1;
      previousBrokerCounters = previousCountersFromPayloads(
        negotiateEvents.map((event) => event.payload ?? {}),
      );
    }

    const carrierOffer = parseFloat(String(body.carrier_offer));
    const demandContext = await getDemandNegotiationContext(load);
    const evaluation = await evaluateOffer(
      load.loadboardRate,
      carrierOffer,
      serverRound,
      demandContext,
      previousBrokerCounters,
    );

    if (body.call_id) {
      await db.insert(callEvents).values({
        callId: body.call_id,
        eventType: "negotiate",
        payload: {
          load_id: body.load_id,
          carrier_offer: carrierOffer,
          round: serverRound,
          client_round: parseInt(String(body.current_round ?? 1), 10),
          accepted: evaluation.accepted,
          counter_offer: evaluation.counter_offer,
          demand_posture: demandContext.posture,
          demand_reason: demandContext.reason,
          demand_context: demandContext,
          message: evaluation.message,
        },
      });
    }

    return NextResponse.json(evaluation);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ detail: err.flatten() }, { status: 400 });
    }
    throw err;
  }
}
