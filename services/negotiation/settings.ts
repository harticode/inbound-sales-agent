import type {
  DemandNegotiationPosture,
  NegotiationPostureSettings,
  PostureSettingsValues,
} from "@/types";
import { postureConfigs, type PostureConfig } from "./config";

const POSTURES: DemandNegotiationPosture[] = [
  "protect_margin",
  "balanced",
  "win_capacity",
];

export const POSTURE_LABELS: Record<
  DemandNegotiationPosture,
  { title: string; description: string }
> = {
  protect_margin: {
    title: "Protect margin",
    description: "Hot lanes — firm counters, never above loadboard.",
  },
  balanced: {
    title: "Balanced",
    description: "Default posture when demand is moderate.",
  },
  win_capacity: {
    title: "Win capacity",
    description: "Light demand — more flexible, may stretch above loadboard.",
  },
};

function postureConfigToValues(
  config: PostureConfig,
  globalMinMarginPct: number,
): PostureSettingsValues {
  return {
    min_margin_pct: config.minMarginPct ?? globalMinMarginPct,
    max_over_loadboard: config.maxOverLoadboard,
    near_accept_pct: config.nearAcceptPct,
    minimum_counter_gap: config.minimumCounterGap,
    gap_share_round_1: config.gapShareByRound[1] ?? 0,
    gap_share_round_2: config.gapShareByRound[2] ?? 0,
    gap_share_round_3: config.gapShareByRound[3] ?? 0,
    round_1_accept_pct: config.roundThresholds[1]?.accept ?? 0,
    round_1_counter_pct: config.roundThresholds[1]?.counterPct ?? 0,
    round_2_accept_pct: config.roundThresholds[2]?.accept ?? 0,
    round_2_counter_pct: config.roundThresholds[2]?.counterPct ?? 0,
    round_3_accept_pct: config.roundThresholds[3]?.accept ?? 0,
    round_3_counter_pct: config.roundThresholds[3]?.counterPct ?? 0,
  };
}

export function defaultNegotiationPostureSettings(
  globalMinMarginPct = 0.05,
): NegotiationPostureSettings {
  return {
    protect_margin: postureConfigToValues(postureConfigs.protect_margin, globalMinMarginPct),
    balanced: postureConfigToValues(postureConfigs.balanced, globalMinMarginPct),
    win_capacity: postureConfigToValues(postureConfigs.win_capacity, globalMinMarginPct),
  };
}

function coerceNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coercePostureSettingsValues(
  raw: unknown,
  fallback: PostureSettingsValues,
): PostureSettingsValues {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    min_margin_pct: coerceNumber(source.min_margin_pct, fallback.min_margin_pct),
    max_over_loadboard: coerceNumber(source.max_over_loadboard, fallback.max_over_loadboard),
    near_accept_pct: coerceNumber(source.near_accept_pct, fallback.near_accept_pct),
    minimum_counter_gap: coerceNumber(source.minimum_counter_gap, fallback.minimum_counter_gap),
    gap_share_round_1: coerceNumber(source.gap_share_round_1, fallback.gap_share_round_1),
    gap_share_round_2: coerceNumber(source.gap_share_round_2, fallback.gap_share_round_2),
    gap_share_round_3: coerceNumber(source.gap_share_round_3, fallback.gap_share_round_3),
    round_1_accept_pct: coerceNumber(source.round_1_accept_pct, fallback.round_1_accept_pct),
    round_1_counter_pct: coerceNumber(source.round_1_counter_pct, fallback.round_1_counter_pct),
    round_2_accept_pct: coerceNumber(source.round_2_accept_pct, fallback.round_2_accept_pct),
    round_2_counter_pct: coerceNumber(source.round_2_counter_pct, fallback.round_2_counter_pct),
    round_3_accept_pct: coerceNumber(source.round_3_accept_pct, fallback.round_3_accept_pct),
    round_3_counter_pct: coerceNumber(source.round_3_counter_pct, fallback.round_3_counter_pct),
  };
}

export function coerceNegotiationPostureSettings(
  raw: unknown,
  globalMinMarginPct = 0.05,
): NegotiationPostureSettings {
  const defaults = defaultNegotiationPostureSettings(globalMinMarginPct);
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  return POSTURES.reduce((acc, posture) => {
    acc[posture] = coercePostureSettingsValues(source[posture], defaults[posture]);
    return acc;
  }, {} as NegotiationPostureSettings);
}
