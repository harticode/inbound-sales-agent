import { money } from "@/lib/utils";
import type {
  DemandNegotiationContext,
  DemandNegotiationPosture,
  NegotiationAction,
  NegotiationResult,
} from "@/types";

function demandMessageSuffix(posture?: DemandNegotiationPosture): string {
  if (posture === "protect_margin") {
    return " Demand is strong on this lane, so we need to stay disciplined on rate.";
  }
  if (posture === "win_capacity") {
    return " We have room to be flexible on this lane and keep the truck moving.";
  }
  return "";
}

type MessageContext = {
  action: NegotiationAction;
  posture?: DemandNegotiationPosture;
};

function renderNegotiationMessage(ctx: MessageContext): string {
  const { action, posture } = ctx;
  const suffix = demandMessageSuffix(posture);

  if (action.type === "accept") {
    switch (action.variant) {
      case "stretch":
        return `I can stretch to $${money(action.price)} to keep this truck moving. Let me transfer you to finalize the booking.`;
      case "final_round":
        return `Alright, we'll accept $${money(action.price)}. Let me transfer you to a rep.`;
      case "offer_rate":
      case "default":
      default:
        return `We can work with $${money(action.price)}. Let me transfer you to finalize the booking.`;
    }
  }

  if (action.type === "counter") {
    switch (action.variant) {
      case "protect_margin":
        return `Demand is strong on this lane. The best I can do right now is $${money(action.price)}.${suffix} Would that work for you?`;
      case "above_loadboard":
        if (posture === "protect_margin") {
          return `That's above what we can do on this lane. The best I can offer is $${money(action.price)}.${suffix} Can we make that work?`;
        }
        return `That's a bit above what we can do on this lane. The best I can offer is $${money(action.price)}.${suffix} Can we make that work?`;
      case "below_loadboard":
      default:
        return `We appreciate the offer. The best we can do right now is $${money(action.price)}.${suffix} Would that work for you?`;
    }
  }

  switch (action.variant) {
    case "below_floor":
      return posture === "protect_margin"
        ? `Unfortunately that's the most we can do on this load.${suffix} We appreciate your time and will keep you in mind for future opportunities.`
        : `Unfortunately that's above what we can do on this load.${suffix} We appreciate your time and will keep you in mind for future opportunities.`;
    case "protect_margin":
    case "above_cap":
    default:
      return `That's above what we can pay on this lane.${suffix} We appreciate your time and will keep you in mind for future opportunities.`;
  }
}

export function actionToResult(
  action: NegotiationAction,
  roundNumber: number,
  demandContext?: DemandNegotiationContext,
): NegotiationResult {
  const base: NegotiationResult = {
    accepted: action.type === "accept",
    counter_offer: action.type === "counter" ? action.price : null,
    message: renderNegotiationMessage({
      action,
      posture: demandContext?.posture,
    }),
    round_number: roundNumber,
    final: action.final,
  };

  if (!demandContext) {
    return base;
  }

  return {
    ...base,
    demand_posture: demandContext.posture,
    demand_reason: demandContext.reason,
  };
}
