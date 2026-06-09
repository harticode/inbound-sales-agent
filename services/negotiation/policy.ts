import { getPostureConfig, getRoundThreshold, type PostureConfig } from "./config";
import type { NegotiationAction, NegotiationPolicyInput } from "@/types";

function roundRate(rate: number): number {
  return Math.round(rate * 100) / 100;
}

function previousBrokerCounter(input: NegotiationPolicyInput): number | null {
  const counters = input.previousBrokerCounters?.filter((counter) => Number.isFinite(counter)) ?? [];
  if (counters.length === 0) return null;
  return Math.max(...counters);
}

function floorCounterAtPreviousOffer(
  counter: number,
  input: NegotiationPolicyInput,
): number {
  const previousCounter = previousBrokerCounter(input);
  return previousCounter == null ? counter : Math.max(counter, previousCounter);
}

function pacedCounterPct(input: NegotiationPolicyInput, ceilingPct: number): number {
  const rounds = Math.max(input.maxRounds, 1);
  const round = Math.min(Math.max(input.currentRound, 1), rounds);
  const progress = round / rounds;
  return input.offerRatePct + (ceilingPct - input.offerRatePct) * progress;
}

function plannedCounter(input: NegotiationPolicyInput): number {
  const roundConfig = getRoundThreshold(input.posture, input.currentRound, input);
  const counterPct = pacedCounterPct(input, roundConfig.counterPct);
  return floorCounterAtPreviousOffer(
    roundRate(input.loadboardRate * counterPct),
    input,
  );
}

function gapShareForRound(config: PostureConfig, round: number): number {
  return config.gapShareByRound[round] ?? config.gapShareByRound[3] ?? 0;
}

function nearAcceptBand(input: NegotiationPolicyInput, config: PostureConfig): number {
  return Math.max(input.loadboardRate * config.nearAcceptPct, config.minimumCounterGap);
}

function effectiveMinMarginPct(input: NegotiationPolicyInput, config: PostureConfig): number {
  return config.minMarginPct ?? input.minMarginPct ?? 0.05;
}

function maxPayForMarginFloor(loadboardRate: number, minMarginPct: number): number {
  return roundRate(loadboardRate * (1 - minMarginPct));
}

function marginPctAtPrice(loadboardRate: number, price: number): number {
  return (loadboardRate - price) / loadboardRate;
}

function canBypassMarginFloorForAccept(
  config: PostureConfig,
  loadboardRate: number,
  price: number,
): boolean {
  return (
    config.allowAboveLoadboardStretch &&
    price > loadboardRate &&
    price <= loadboardRate * config.maxOverLoadboard
  );
}

function applyMarginFloor(
  action: NegotiationAction,
  input: NegotiationPolicyInput,
): NegotiationAction {
  if (action.type !== "accept") {
    return action;
  }

  const config = getPostureConfig(input.posture, input);
  const minMarginPct = effectiveMinMarginPct(input, config);
  const { loadboardRate, currentRound, maxRounds } = input;

  if (canBypassMarginFloorForAccept(config, loadboardRate, action.price)) {
    return action;
  }

  if (marginPctAtPrice(loadboardRate, action.price) >= minMarginPct) {
    return action;
  }

  if (currentRound >= maxRounds) {
    return { type: "reject", final: true, variant: "below_floor" };
  }

  return {
    type: "counter",
    price: floorCounterAtPreviousOffer(
      maxPayForMarginFloor(loadboardRate, minMarginPct),
      input,
    ),
    final: false,
    variant: "protect_margin",
  };
}

function responsiveCounter(
  input: NegotiationPolicyInput,
  config: PostureConfig,
  planned: number,
): number {
  const gap = Math.max(input.carrierOffer - planned, 0);
  const brokerShare = gapShareForRound(config, input.currentRound);
  const splitCounter = planned + gap * brokerShare;
  const belowCarrierAsk = input.carrierOffer - config.minimumCounterGap;
  const postureCap = input.loadboardRate * config.maxOverLoadboard;

  return floorCounterAtPreviousOffer(
    roundRate(Math.max(planned, Math.min(splitCounter, belowCarrierAsk, postureCap))),
    input,
  );
}

function defaultCounterVariant(input: NegotiationPolicyInput): NegotiationAction["variant"] {
  if (input.posture === "protect_margin") {
    return "protect_margin";
  }
  return "below_loadboard";
}

function handleAboveLoadboard(
  input: NegotiationPolicyInput,
  config: PostureConfig,
  counter: number,
): NegotiationAction {
  const { loadboardRate, carrierOffer, currentRound, maxRounds, posture } = input;
  const maxPayCap = roundRate(loadboardRate * config.maxOverLoadboard);

  if (currentRound >= maxRounds) {
    if (config.allowAboveLoadboardStretch && carrierOffer <= maxPayCap) {
      return {
        type: "accept",
        price: carrierOffer,
        final: true,
        variant: posture === "win_capacity" ? "stretch" : "final_round",
      };
    }

    if (config.allowAboveLoadboardStretch) {
      return { type: "reject", final: true, variant: "above_cap" };
    }

    return { type: "reject", final: true, variant: "protect_margin" };
  }

  return {
    type: "counter",
    price: counter,
    final: false,
    variant: "above_loadboard",
  };
}

function handleFinalRoundBelowLoadboard(
  input: NegotiationPolicyInput,
  config: PostureConfig,
): NegotiationAction {
  const { loadboardRate, carrierOffer, maxRounds, posture } = input;
  const maxRoundConfig = getRoundThreshold(posture, maxRounds, input);
  const minAcceptable = roundRate(loadboardRate * (1 - maxRoundConfig.accept));

  if (carrierOffer >= minAcceptable) {
    return { type: "accept", price: carrierOffer, final: true, variant: "final_round" };
  }

  return { type: "reject", final: true, variant: "below_floor" };
}

function computePostureAction(input: NegotiationPolicyInput): NegotiationAction {
  const { loadboardRate, carrierOffer, currentRound, maxRounds, posture } = input;
  const config = getPostureConfig(posture, input);
  const roundConfig = getRoundThreshold(posture, currentRound, input);
  const planned = plannedCounter(input);
  const counter = responsiveCounter(input, config, planned);
  const discountPct = (loadboardRate - carrierOffer) / loadboardRate;

  if (carrierOffer <= planned + nearAcceptBand(input, config)) {
    return { type: "accept", price: carrierOffer, final: true, variant: "default" };
  }

  if (carrierOffer > loadboardRate) {
    return handleAboveLoadboard(input, config, counter);
  }

  if (discountPct <= roundConfig.accept) {
    return { type: "accept", price: carrierOffer, final: true, variant: "default" };
  }

  if (currentRound >= maxRounds) {
    return handleFinalRoundBelowLoadboard(input, config);
  }

  return {
    type: "counter",
    price: counter,
    final: false,
    variant: defaultCounterVariant(input),
  };
}

export function computeAction(input: NegotiationPolicyInput): NegotiationAction {
  const offerRate = input.loadboardRate * input.offerRatePct;
  const previousCounter = previousBrokerCounter(input);

  if (previousCounter != null && input.carrierOffer <= previousCounter) {
    return applyMarginFloor(
      {
        type: "accept",
        price: input.carrierOffer,
        final: true,
        variant: "final_round",
      },
      input,
    );
  }

  if (input.carrierOffer <= offerRate) {
    return applyMarginFloor(
      {
        type: "accept",
        price: input.carrierOffer,
        final: true,
        variant: "offer_rate",
      },
      input,
    );
  }

  return applyMarginFloor(computePostureAction(input), input);
}
