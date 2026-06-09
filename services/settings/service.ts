import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appSettings } from "@/db/schema";
import { getSettings } from "@/config/env";
import {
  coerceNegotiationPostureSettings,
  defaultNegotiationPostureSettings,
} from "@/services/negotiation/settings";

export const KNOWN_SETTINGS: Record<
  string,
  [string, unknown, string | null]
> = {
  offer_rate_pct: ["number", 0.85, "offerRatePct"],
  negotiation_min_margin_pct: ["number", 0.05, "negotiationMinMarginPct"],
  negotiation_posture_config: ["json", defaultNegotiationPostureSettings(), null],
  carrier_cache_ttl_hours: ["integer", 24, "carrierCacheTtlHours"],
  agent_avg_human_handle_minutes: ["number", 8.0, "agentAvgHumanHandleMinutes"],
  agent_avg_human_cost_per_call: ["number", 12.5, "agentAvgHumanCostPerCall"],
};

function coerce(value: unknown, kind: string): unknown {
  if (kind === "boolean") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    return Boolean(value);
  }
  if (kind === "integer") return parseInt(String(value), 10);
  if (kind === "number") return parseFloat(String(value));
  if (kind === "json") {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        return {};
      }
    }
    return {};
  }
  if (kind === "array") {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    return [];
  }
  if (kind === "secret") {
    if (typeof value === "object" && value !== null) {
      const v = value as Record<string, string>;
      return { label: String(v.label ?? "").trim(), value: String(v.value ?? "") };
    }
    if (typeof value === "string") return { label: value ? "(migrated)" : "", value };
    return { label: "", value: "" };
  }
  if (kind === "labeled_list") {
    if (!Array.isArray(value)) return [];
    const out: { id: string; label: string; number: string }[] = [];
    for (const item of value) {
      if (typeof item === "object" && item !== null) {
        const o = item as Record<string, string>;
        const number = String(o.number ?? "").trim();
        if (!number) continue;
        out.push({
          id: o.id || randomUUID(),
          label: String(o.label ?? "").trim() || "(unlabeled)",
          number,
        });
      } else if (typeof item === "string") {
        const number = item.trim();
        if (!number) continue;
        out.push({ id: randomUUID(), label: "(migrated)", number });
      }
    }
    return out;
  }
  return String(value ?? "");
}

function redact(value: unknown, kind: string): unknown {
  if (kind === "secret") {
    const v = value as { label: string; value: string };
    return { label: v.label ?? "", configured: Boolean(v.value) };
  }
  if (kind === "labeled_list") {
    return (value as { id: string; label: string }[]).map((item) => ({
      id: item.id,
      label: item.label,
    }));
  }
  return value;
}

export async function getRuntimeSettings(revealSecrets = false): Promise<Record<string, unknown>> {
  const env = getSettings();
  const rows = await db.select().from(appSettings);
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const effective: Record<string, unknown> = {};
  for (const [key, [kind, defaultVal, envAttr]] of Object.entries(KNOWN_SETTINGS)) {
    let value: unknown;
    if (key in overrides) {
      value = coerce(overrides[key], kind);
    } else if (envAttr && envAttr in env) {
      value = (env as Record<string, unknown>)[envAttr];
    } else {
      value = ["secret", "labeled_list"].includes(kind) ? coerce(defaultVal, kind) : defaultVal;
    }
    effective[key] = revealSecrets ? value : redact(value, kind);
  }
  return effective;
}

export async function updateRuntimeSettings(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const unknown = Object.keys(payload).filter((k) => !(k in KNOWN_SETTINGS));
  if (unknown.length) throw new Error(`Unknown setting keys: ${unknown.sort().join(", ")}`);

  for (const [key, rawValue] of Object.entries(payload)) {
    const [kind] = KNOWN_SETTINGS[key];
    const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);

    if (kind === "secret") {
      const incoming = coerce(rawValue, kind) as { label: string; value: string };
      const prior = existing
        ? (coerce(existing.value, kind) as { label: string; value: string })
        : { label: "", value: "" };
      const merged = {
        label: incoming.label || prior.label,
        value: incoming.value || prior.value,
      };
      if (existing) {
        await db.update(appSettings).set({ value: merged }).where(eq(appSettings.key, key));
      } else {
        await db.insert(appSettings).values({ key, value: merged });
      }
      continue;
    }

    if (kind === "labeled_list") {
      const incomingRaw = Array.isArray(rawValue) ? rawValue : [];
      const existingList = existing
        ? (coerce(existing.value, kind) as { id: string; label: string; number: string }[])
        : [];
      const existingById = Object.fromEntries(existingList.map((i) => [i.id, i]));
      const mergedList: { id: string; label: string; number: string }[] = [];

      for (const item of incomingRaw) {
        if (typeof item !== "object" || item === null) continue;
        const o = item as Record<string, string>;
        const itemId = o.id;
        if (itemId && existingById[itemId]) {
          const prior = existingById[itemId];
          mergedList.push({
            id: prior.id,
            label: String(o.label ?? prior.label).trim() || prior.label,
            number: prior.number,
          });
        } else {
          const number = String(o.number ?? "").trim();
          if (!number) continue;
          mergedList.push({
            id: randomUUID(),
            label: String(o.label ?? "").trim() || "(unlabeled)",
            number,
          });
        }
      }

      if (existing) {
        await db.update(appSettings).set({ value: mergedList }).where(eq(appSettings.key, key));
      } else {
        await db.insert(appSettings).values({ key, value: mergedList });
      }
      continue;
    }

    const value =
      kind === "json"
        ? coerceNegotiationPostureSettings(coerce(rawValue, kind))
        : coerce(rawValue, kind);
    if (existing) {
      await db.update(appSettings).set({ value }).where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value });
    }
  }

  return getRuntimeSettings();
}

export async function resetRuntimeSettings(): Promise<Record<string, unknown>> {
  await db.delete(appSettings);
  return getRuntimeSettings();
}
