import type { DemandNegotiationPosture } from "@/types";
import type { NegotiationPostureSettings, PostureSettingsValues } from "@/types";

export type RoundThreshold = {
  accept: number;
  counterPct: number;
};

export type PostureConfig = {
  name: DemandNegotiationPosture;
  maxOverLoadboard: number;
  roundThresholds: Record<number, RoundThreshold>;
  nearAcceptPct: number;
  minimumCounterGap: number;
  gapShareByRound: Record<number, number>;
  /** Optional posture-specific margin floor override (fraction of loadboard). */
  minMarginPct?: number;
  /** Allow final accepts above loadboard without applying the margin floor. */
  allowAboveLoadboardStretch: boolean;
};

/** Negotiation is implemented for exactly three rounds. */
export const NEGOTIATION_MAX_ROUNDS = 3;

export const POSTURE_SCORE_THRESHOLDS = {
  protectMargin: 0.7,
  winCapacity: 0.3,
} as const;

/** Default tightness prior for lanes with no historical demand. */
export const COLD_START_POSTURE_PRIOR = 0.6;

const BALANCED_ROUND_THRESHOLDS: Record<number, RoundThreshold> = {
  1: { accept: 0.05, counterPct: 0.93 },
  2: { accept: 0.08, counterPct: 0.97 },
  3: { accept: 0.12, counterPct: 1.0 },
};

const PROTECT_MARGIN_ROUND_THRESHOLDS: Record<number, RoundThreshold> = {
  1: { accept: 0.03, counterPct: 0.9 },
  2: { accept: 0.05, counterPct: 0.94 },
  3: { accept: 0.07, counterPct: 0.97 },
};

export const postureConfigs: Record<DemandNegotiationPosture, PostureConfig> = {
  protect_margin: {
    name: "protect_margin",
    maxOverLoadboard: 1.0,
    minMarginPct: 0.05,
    allowAboveLoadboardStretch: false,
    nearAcceptPct: 0.005,
    minimumCounterGap: 25,
    gapShareByRound: {
      1: 0.1,
      2: 0.15,
      3: 0.2,
    },
    roundThresholds: PROTECT_MARGIN_ROUND_THRESHOLDS,
  },
  balanced: {
    name: "balanced",
    maxOverLoadboard: 1.05,
    allowAboveLoadboardStretch: true,
    nearAcceptPct: 0.01,
    minimumCounterGap: 25,
    gapShareByRound: {
      1: 0.15,
      2: 0.2,
      3: 0.25,
    },
    roundThresholds: BALANCED_ROUND_THRESHOLDS,
  },
  win_capacity: {
    name: "win_capacity",
    maxOverLoadboard: 1.1,
    allowAboveLoadboardStretch: true,
    nearAcceptPct: 0.012,
    minimumCounterGap: 25,
    gapShareByRound: {
      1: 0.2,
      2: 0.25,
      3: 0.3,
    },
    roundThresholds: {
      1: { accept: 0.09, counterPct: 0.95 },
      2: { accept: 0.12, counterPct: 0.97 },
      3: { accept: 0.16, counterPct: 1.03 },
    },
  },
};

const DEFAULT_ROUND = 3;

export type PostureConfigContext = {
  postureSettings?: NegotiationPostureSettings;
  minMarginPct?: number;
};

export function getRoundThreshold(
  posture: DemandNegotiationPosture,
  round: number,
  context?: PostureConfigContext,
): RoundThreshold {
  const config = getPostureConfig(posture, context);
  const threshold =
    config.roundThresholds[round] ??
    config.roundThresholds[DEFAULT_ROUND];

  if (!threshold) {
    throw new Error(`No round threshold for posture ${posture} round ${round}`);
  }

  return threshold;
}

function mergePostureConfig(
  base: PostureConfig,
  values: PostureSettingsValues,
  globalMinMarginPct?: number,
): PostureConfig {
  return {
    ...base,
    minMarginPct: values.min_margin_pct ?? base.minMarginPct ?? globalMinMarginPct,
    maxOverLoadboard: values.max_over_loadboard,
    nearAcceptPct: values.near_accept_pct,
    minimumCounterGap: values.minimum_counter_gap,
    gapShareByRound: {
      1: values.gap_share_round_1,
      2: values.gap_share_round_2,
      3: values.gap_share_round_3,
    },
    roundThresholds: {
      1: { accept: values.round_1_accept_pct, counterPct: values.round_1_counter_pct },
      2: { accept: values.round_2_accept_pct, counterPct: values.round_2_counter_pct },
      3: { accept: values.round_3_accept_pct, counterPct: values.round_3_counter_pct },
    },
  };
}

export function getPostureConfig(
  posture: DemandNegotiationPosture,
  context?: PostureConfigContext,
): PostureConfig {
  const base = postureConfigs[posture];
  if (!context?.postureSettings) {
    return base;
  }

  return mergePostureConfig(
    base,
    context.postureSettings[posture],
    context.minMarginPct,
  );
}
