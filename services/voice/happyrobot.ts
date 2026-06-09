import { randomUUID } from "crypto";
import { HappyRobotClient } from "@happyrobot-ai/sdk";
import type { CreateVoiceTokenResponse } from "@happyrobot-ai/sdk";
import { getSettings } from "@/config/env";

function generateLiveCallId(): string {
  return `LIVE-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

type VoiceTokenResult = CreateVoiceTokenResponse & { call_id: string };

export async function createVoiceToken(
  data?: Record<string, unknown>,
): Promise<VoiceTokenResult> {
  const settings = getSettings();
  if (!settings.happyrobotApiKey) {
    throw new Error("HAPPYROBOT_API_KEY is not configured");
  }
  if (!settings.happyrobotWorkflowId) {
    throw new Error("HAPPYROBOT_WORKFLOW_ID is not configured");
  }

  const env =
    (process.env.HAPPYROBOT_ENV as "production" | "staging" | "development" | undefined) ??
    "production";

  const callId =
    typeof data?.call_id === "string" && data.call_id.trim()
      ? data.call_id.trim()
      : generateLiveCallId();

  const client = new HappyRobotClient({ apiKey: settings.happyrobotApiKey });
  const token = await client.voice.createToken({
    workflow_id: settings.happyrobotWorkflowId,
    data: { ...data, call_id: callId },
    env,
  });

  return {
    ...token,
    call_id: callId,
  };
}
