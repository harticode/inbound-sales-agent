import { eq, gt, and } from "drizzle-orm";
import { db } from "@/db/client";
import { callEvents } from "@/db/schema";
import { serializeCallEvent } from "@/db/serializers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastId = 0;
      const start = Date.now();
      const timeout = 600000;

      while (Date.now() - start < timeout) {
        const events = await db
          .select()
          .from(callEvents)
          .where(and(eq(callEvents.callId, callId), gt(callEvents.id, lastId)))
          .orderBy(callEvents.id);

        for (const event of events) {
          const data = serializeCallEvent(event);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          lastId = event.id;
          if (event.eventType === "call_logged") {
            controller.close();
            return;
          }
        }

        await new Promise((r) => setTimeout(r, 1000));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
