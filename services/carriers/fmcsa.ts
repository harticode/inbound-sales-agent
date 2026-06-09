import { getSettings } from "@/config/env";

const FMCSA_BASE_URL = "https://mobile.fmcsa.dot.gov/qc/services/carriers";

const DEMO_MC_NUMBER = "123456";

function normalizeMcNumber(mcNumber: string): string {
  return String(mcNumber ?? "")
    .trim()
    .toUpperCase()
    .replace(/MC/g, "")
    .replace(/-/g, "")
    .trim();
}

function demoCarrierRecord(mcNumber: string) {
  return {
    mc_number: mcNumber,
    legal_name: "PPX LOGISTICS INC",
    dba_name: "PPX Logistics",
    dot_number: "DEMO-123456",
    entity_type: "CARRIER",
    operating_status: "ACTIVE",
    allowed_to_operate: "Y",
    phone: "Chicago, IL",
    total_drivers: 12,
    total_power_units: 10,
    is_eligible: true,
    eligibility_reason: "Demo carrier — authorized to operate",
  };
}

export function getDemoCarrierIfApplicable(mcNumber: string) {
  const mc = normalizeMcNumber(mcNumber);
  if (mc === DEMO_MC_NUMBER) {
    return demoCarrierRecord(DEMO_MC_NUMBER);
  }
  return null;
}

function emptyCarrier(mcNumber: string, reason: string) {
  return {
    mc_number: mcNumber,
    legal_name: "",
    dba_name: "",
    dot_number: "",
    entity_type: "",
    operating_status: "",
    allowed_to_operate: "",
    phone: "",
    total_drivers: null as number | null,
    total_power_units: null as number | null,
    is_eligible: false,
    eligibility_reason: reason,
  };
}

async function fetchFmcsaDirect(mcNumber: string, apiKey: string) {
  const url = `${FMCSA_BASE_URL}/docket-number/${mcNumber}`;
  try {
    const resp = await fetch(`${url}?webKey=${encodeURIComponent(apiKey)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) return resp.json();
  } catch {
    /* fall through */
  }
  return null;
}

function parseCarrier(mcNumber: string, data: Record<string, unknown>) {
  const content = (data.content as Record<string, unknown>[]) ?? [];
  if (!content.length) {
    return emptyCarrier(mcNumber, `No carrier found for MC number ${mcNumber}`);
  }

  const carrier = (content[0].carrier as Record<string, unknown>) ?? {};
  const allowed = String(carrier.allowedToOperate ?? "").trim().toUpperCase();
  const statusCode = String(carrier.statusCode ?? "").trim().toUpperCase();
  const legalName = String(carrier.legalName ?? "").trim();
  const dbaName = String(carrier.dbaName ?? "").trim();
  const dotNumber = String(carrier.dotNumber ?? "");
  const totalDrivers = carrier.totalDrivers as number | undefined;
  const totalPowerUnits = carrier.totalPowerUnits as number | undefined;

  const census = (carrier.censusTypeId as Record<string, unknown>) ?? {};
  const entityType =
    typeof census === "object" && census
      ? String(census.censusTypeDesc ?? "").trim()
      : "";

  const phyCity = String(carrier.phyCity ?? "").trim();
  const phyState = String(carrier.phyState ?? "").trim();
  const phone = String(carrier.phyPhone ?? "").trim();
  const location = phyCity && phyState ? `${phyCity}, ${phyState}` : "";

  const operatingStatus =
    statusCode === "A"
      ? "ACTIVE"
      : statusCode
        ? `INACTIVE (${statusCode})`
        : "UNKNOWN";

  const isEligible = allowed === "Y" && statusCode === "A";
  let reason: string;
  if (isEligible) reason = "Carrier is authorized to operate";
  else if (allowed !== "Y") reason = "Carrier is not allowed to operate";
  else reason = `Carrier status: ${operatingStatus}`;

  return {
    mc_number: mcNumber,
    legal_name: legalName,
    dba_name: dbaName,
    dot_number: dotNumber,
    entity_type: entityType,
    operating_status: operatingStatus,
    allowed_to_operate: allowed,
    phone: phone || location,
    total_drivers: totalDrivers ?? null,
    total_power_units: totalPowerUnits ?? null,
    is_eligible: isEligible,
    eligibility_reason: reason,
  };
}

export async function verifyCarrier(mcNumber: string) {
  const demo = getDemoCarrierIfApplicable(mcNumber);
  if (demo) return demo;

  const mc = normalizeMcNumber(mcNumber);
  const settings = getSettings();
  if (!settings.fmcsaApiKey) {
    return emptyCarrier(mcNumber, "FMCSA API key is not configured");
  }

  const data = await fetchFmcsaDirect(mcNumber, settings.fmcsaApiKey);
  if (data === null) {
    return emptyCarrier(mc, "Could not reach FMCSA API");
  }

  return parseCarrier(mc, data as Record<string, unknown>);
}
