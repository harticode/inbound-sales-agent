export interface NegotiationResult {
  accepted: boolean;
  counter_offer: number | null;
  message: string;
  round_number: number;
  final: boolean;
  demand_posture?: DemandNegotiationPosture;
  demand_reason?: string;
}

export type DemandNegotiationPosture = "protect_margin" | "balanced" | "win_capacity";

export type PostureSettingsValues = {
  min_margin_pct: number;
  max_over_loadboard: number;
  near_accept_pct: number;
  minimum_counter_gap: number;
  gap_share_round_1: number;
  gap_share_round_2: number;
  gap_share_round_3: number;
  round_1_accept_pct: number;
  round_1_counter_pct: number;
  round_2_accept_pct: number;
  round_2_counter_pct: number;
  round_3_accept_pct: number;
  round_3_counter_pct: number;
};

export type NegotiationPostureSettings = Record<
  DemandNegotiationPosture,
  PostureSettingsValues
>;

export interface DemandNegotiationContext {
  posture: DemandNegotiationPosture;
  request_count: number;
  available_loads: number;
  conversion_rate: number;
  no_load_rate: number;
  negotiation_loss_rate: number;
  reason: string;
  posture_score?: number;
}

export type NegotiationPolicyInput = {
  loadboardRate: number;
  carrierOffer: number;
  currentRound: number;
  maxRounds: number;
  posture: DemandNegotiationPosture;
  offerRatePct: number;
  minMarginPct?: number;
  postureSettings?: NegotiationPostureSettings;
  previousBrokerCounters?: number[];
};

type NegotiationActionVariant =
  | "default"
  | "offer_rate"
  | "final_round"
  | "stretch"
  | "above_loadboard"
  | "below_loadboard"
  | "protect_margin"
  | "above_cap"
  | "below_floor";

export type NegotiationAction =
  | { type: "accept"; price: number; final: boolean; variant?: NegotiationActionVariant }
  | { type: "counter"; price: number; final: boolean; variant?: NegotiationActionVariant }
  | { type: "reject"; final: boolean; variant?: NegotiationActionVariant };

export type PostureScoreInput = {
  requestCount: number;
  availableLoads: number;
  conversionRate: number;
  noLoadRate: number;
  negotiationLossRate: number;
};

export type PostureScoreResult = {
  score: number;
  posture: DemandNegotiationPosture;
  reason: string;
};

export type LaneFeatures = {
  availableLoadRatio: number;
  pickupDayOfWeek?: number;
};
