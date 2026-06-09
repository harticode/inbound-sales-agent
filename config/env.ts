export function getSettings() {
  return {
    appName: "Inbound Carrier Sales API",
    databaseUrl:
      process.env.DATABASE_URL ??
      "postgresql://carrier:carrier@localhost:5432/carrier_sales",
    fmcsaApiKey: process.env.FMCSA_API_KEY ?? "",
    apiKey: process.env.API_KEY ?? "",
    allowedOrigins: (process.env.ALLOWED_ORIGINS ??
      "http://localhost:5173,http://localhost:3000,http://localhost:80,http://localhost")
      .split(",")
      .map((s) => s.trim()),
    negotiationMinMarginPct: parseFloat(process.env.NEGOTIATION_MIN_MARGIN_PCT ?? "0.05"),
    offerRatePct: parseFloat(process.env.OFFER_RATE_PCT ?? "0.85"),
    carrierCacheTtlHours: parseInt(process.env.CARRIER_CACHE_TTL_HOURS ?? "24", 10),
    agentAvgHumanHandleMinutes: parseFloat(process.env.AGENT_AVG_HUMAN_HANDLE_MINUTES ?? "8.0"),
    agentAvgHumanCostPerCall: parseFloat(process.env.AGENT_AVG_HUMAN_COST_PER_CALL ?? "12.50"),
    happyrobotApiKey: process.env.HAPPYROBOT_API_KEY ?? "",
    happyrobotWorkflowId: process.env.HAPPYROBOT_WORKFLOW_ID ?? "",
    dashboardUrl: process.env.DASHBOARD_URL ?? "http://localhost",
  };
}
