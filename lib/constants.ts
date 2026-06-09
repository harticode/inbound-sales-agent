export const WON_OUTCOMES = new Set(["booked", "transferred"]);

export const NEGOTIATED_OUTCOMES = new Set([
  "booked",
  "transferred",
  "declined",
  "negotiation_failed",
]);

export const PRICING_LOSS_OUTCOMES = new Set(["declined", "negotiation_failed"]);

export const SENTIMENT_SCORES: Record<string, number> = {
  positive: 3,
  neutral: 2,
  negative: 1,
  frustrated: 0,
};

export const PICKUP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
