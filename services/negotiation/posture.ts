import {
  COLD_START_POSTURE_PRIOR,
  POSTURE_SCORE_THRESHOLDS,
} from "./config";
import type {
  DemandNegotiationPosture,
  LaneFeatures,
  PostureScoreInput,
  PostureScoreResult,
} from "@/types";

export function scoreToPosture(score: number): DemandNegotiationPosture {
  if (score >= POSTURE_SCORE_THRESHOLDS.protectMargin) {
    return "protect_margin";
  }
  if (score <= POSTURE_SCORE_THRESHOLDS.winCapacity) {
    return "win_capacity";
  }
  return "balanced";
}

function postureReason(posture: DemandNegotiationPosture): string {
  switch (posture) {
    case "protect_margin":
      return "High historical demand with limited available inventory; stay firm and protect margin.";
    case "win_capacity":
      return "Light demand or soft conversion with available inventory; be more flexible to win coverage.";
    default:
      return "Demand and inventory are balanced, so use the standard negotiation posture.";
  }
}

function predictFromLaneFeatures(features: LaneFeatures): number {
  let score = COLD_START_POSTURE_PRIOR;

  if (features.availableLoadRatio > 1) {
    score -= 0.25;
  } else if (features.availableLoadRatio < 0.5) {
    score += 0.15;
  }

  if (features.pickupDayOfWeek !== undefined) {
    const isPeakDay = features.pickupDayOfWeek === 4 || features.pickupDayOfWeek === 5;
    if (isPeakDay) {
      score += 0.05;
    }
  }

  return Math.max(0, Math.min(1, score));
}

export function computePostureScore(
  input: PostureScoreInput,
  laneFeatures?: LaneFeatures,
): number {
  const {
    requestCount,
    availableLoads,
    conversionRate,
    noLoadRate,
    negotiationLossRate,
  } = input;

  if (requestCount === 0) {
    if (
      availableLoads > requestCount &&
      (requestCount <= 1 || conversionRate < 0.25 || negotiationLossRate >= 0.4)
    ) {
      return 0.15;
    }

    const ratio = availableLoads;
    return predictFromLaneFeatures({
      availableLoadRatio: ratio,
      ...laneFeatures,
    });
  }

  if (
    requestCount >= 2 &&
    noLoadRate <= 0.25 &&
    conversionRate >= 0.4 &&
    availableLoads <= requestCount
  ) {
    return 0.85;
  }

  if (
    availableLoads > requestCount &&
    (requestCount <= 1 || conversionRate < 0.25 || negotiationLossRate >= 0.4)
  ) {
    return 0.15;
  }

  return 0.55;
}

export function resolveDemandPosture(
  args: PostureScoreInput,
  laneFeatures?: LaneFeatures,
): PostureScoreResult {
  const score = computePostureScore(args, laneFeatures);
  const posture = scoreToPosture(score);
  return {
    score,
    posture,
    reason: postureReason(posture),
  };
}
