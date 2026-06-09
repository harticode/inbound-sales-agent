export interface LoadRecord {
  id: number;
  load_id: string;
  origin: string;
  destination: string;
  pickup_datetime: string;
  delivery_datetime: string;
  equipment_type: string;
  loadboard_rate: number;
  offer_rate: number;
  notes: string;
  weight: number | null;
  commodity_type: string;
  num_of_pieces: number | null;
  miles: number | null;
  dimensions: string;
  status: string;
  created_at: string;
}

export interface LoadSearchParams {
  origin?: string;
  destination?: string;
  equipment_type?: string;
  min_rate?: number;
  max_weight?: number;
  pickup_date?: string;
}
