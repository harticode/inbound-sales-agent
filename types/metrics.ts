export interface AgentImpact {
  hours_saved: number;
  cost_savings: number;
  avg_human_cost_per_call: number;
  avg_handle_time_minutes: number;
  automation_rate: number;
  calls_outside_business_hours: number;
  revenue_per_call: number;
}

export interface LaneRoute {
  lane: string;
  origin: string;
  destination: string;
  origin_coords: [number, number];
  dest_coords: [number, number];
  call_count: number;
  booked_count: number;
  conversion_rate: number;
  revenue_booked: number;
  available_loads: number;
  supply_gap: boolean;
  geocoded: boolean;
}

export type DemandRecommendation = "raise_rate" | "hold_rate" | "be_flexible";

export interface DemandKpis {
  total_requested_lanes: number;
  no_load_rate: number;
  negotiation_loss_rate: number;
  top_requested_lane: string;
  top_requested_equipment: string;
  avg_requested_miles: number | null;
  premium_opportunities: number;
  soft_negotiation_opportunities: number;
}

export interface DemandProfile {
  lane: string;
  origin: string;
  destination: string;
  equipment: string;
  request_count: number;
  no_load_count: number;
  negotiation_failed_count: number;
  declined_count: number;
  booked_count: number;
  available_loads: number;
  avg_miles: number | null;
  avg_loadboard_rate: number | null;
  pickup_windows: { label: string; count: number }[];
  top_pickup_window: string | null;
  conversion_rate: number;
  no_load_rate: number;
  negotiation_loss_rate: number;
  recommendation: DemandRecommendation;
  recommendation_label: string;
  recommendation_reason: string;
}

export interface NegotiationRound {
  round: number;
  attempts: number;
  accepted: number;
  win_rate: number;
  avg_discount_pct: number;
}

export interface DemandNegotiationBreakdown {
  posture: "protect_margin" | "balanced" | "win_capacity";
  label: string;
  attempts: number;
  accepted: number;
  win_rate: number;
  avg_discount_pct: number;
}

export interface MetricsSummary {
  total_calls: number;
  total_booked: number;
  total_declined: number;
  booking_rate: number;
  avg_negotiation_rounds: number;
  avg_discount_pct: number;
  total_revenue_booked: number;
  avg_call_duration_seconds: number;
  sentiment_distribution: Record<string, number>;
  outcome_distribution: Record<string, number>;
  calls_by_day: { date: string; count: number }[];
  top_lanes: { lane: string; count: number; booked: number }[];
  equipment_distribution: Record<string, number>;
  rate_comparison: {
    call_id: string;
    loadboard_rate: number;
    agreed_rate: number;
    discount_pct: number;
  }[];
  conversion_funnel: { stage: string; count: number }[];
  total_margin_saved: number;
  agent_impact: AgentImpact | null;
  negotiation_breakdown: NegotiationRound[];
  demand_negotiation_breakdown: DemandNegotiationBreakdown[];
  lost_revenue: number;
  peak_hours: { day: number; hour: number; count: number }[];
  carrier_leaderboard: {
    mc_number: string;
    name: string;
    total_calls: number;
    booked: number;
    booking_rate: number;
    avg_sentiment_score: number;
  }[];
  lane_demand_vs_inventory: {
    lane: string;
    call_count: number;
    available_loads: number;
  }[];
  lane_routes: LaneRoute[];
  demand_kpis: DemandKpis;
  demand_profiles: DemandProfile[];
  period_comparison: {
    total_calls_prev: number;
    total_booked_prev: number;
    revenue_prev: number;
    discount_pct_prev: number;
  };
}
