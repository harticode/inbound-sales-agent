export interface CallRecord {
  id: number;
  call_id: string;
  carrier_mc_number: string;
  carrier_name: string;
  caller_name: string;
  origin_requested: string;
  destination_requested: string;
  equipment_requested: string;
  loadboard_rate: number | null;
  initial_offer: number | null;
  final_agreed_rate: number | null;
  counter_offers: { round: number; carrier: number; broker: number | null }[];
  negotiation_rounds: number;
  outcome: string;
  sentiment: string;
  call_duration_seconds: number | null;
  notes: string;
  extracted_data: Record<string, unknown>;
  transcript_summary: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface CallEvent {
  id: number;
  call_id: string;
  event_type:
    | "call_started"
    | "carrier_verify"
    | "load_search"
    | "negotiate"
    | "call_logged";
  payload: Record<string, unknown>;
  created_at: string;
}

export interface CallDetail extends CallRecord {
  events: CallEvent[];
}

export interface ActiveCall {
  call_id: string;
  started_at: string;
  last_event: CallEvent;
  event_count: number;
}
