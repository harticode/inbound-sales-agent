# HappyRobot Tool Definitions

Configure these four tools in the HappyRobot workflow editor. Each tool calls your Next.js API.

Replace placeholders before saving:
- `YOUR_API_URL` — public HTTPS URL (ngrok tunnel or deployed host, no trailing slash)
- `YOUR_API_KEY` — same value as `API_KEY` in your `.env`

All agent-facing tools require the `X-API-Key` header. Dashboard GET requests from the same origin are exempt.

---

## call_id — required on every tool

At the start of each call, the agent silently generates a unique ID (format: `CALL-` + 6 alphanumeric chars, e.g. `CALL-ABCDE1`). **Pass this same `call_id` to every tool call** so the dashboard can reconstruct the full call timeline.

---

## Tool 1: verify_carrier

**Description:** Verify a carrier's MC number against the FMCSA SAFER database.

**When to use:** Immediately after the carrier provides their MC number.

**HTTP configuration:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `YOUR_API_URL/api/carriers/verify` |
| Headers | `Content-Type: application/json`, `X-API-Key: YOUR_API_KEY` |

**Request body:**

```json
{
  "mc_number": "{{mc_number}}",
  "call_id": "{{call_id}}"
}
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| mc_number | string | yes | Carrier MC number (digits only, no "MC" prefix needed) |
| call_id | string | no | Same call ID used across all tools in this conversation |

**Response fields to use:**

| Field | Type | Description |
|-------|------|-------------|
| is_eligible | boolean | Whether the carrier is authorized to operate |
| legal_name | string | Carrier legal name — greet them by this |
| operating_status | string | FMCSA operating status |
| eligibility_reason | string | Human-readable eligibility explanation |
| dot_number | string | DOT number |
| total_power_units | number | Fleet size |

---

## Tool 2: search_loads

**Description:** Search available loads by lane and equipment type. Returns `offer_rate` (not loadboard rate) for the agent to pitch.

**When to use:** After carrier is verified and states their preferred lane/equipment.

**HTTP configuration:**

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `YOUR_API_URL/api/loads/search` |
| Headers | `X-API-Key: YOUR_API_KEY` |

**Query parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| origin | string | no | Origin city or state (partial match) |
| destination | string | no | Destination city or state (partial match) |
| equipment_type | string | no | Dry Van, Reefer, Flatbed, etc. |
| call_id | string | no | Same call ID — logs a `load_search` event |

**Example URL:**

```
YOUR_API_URL/api/loads/search?origin=Chicago&destination=Dallas&equipment_type=Dry+Van&call_id=CALL-ABCDE1
```

**Response fields to use:**

```json
{
  "loads": [
    {
      "load_id": "LD-1001",
      "origin": "Chicago, IL",
      "destination": "Dallas, TX",
      "pickup_datetime": "2026-04-10T08:00:00.000Z",
      "delivery_datetime": "2026-04-11T18:00:00.000Z",
      "equipment_type": "Dry Van",
      "offer_rate": 2422.50,
      "miles": 920,
      "weight": 38000,
      "commodity_type": "Consumer Electronics",
      "notes": "No-touch freight. Dock-to-dock delivery."
    }
  ],
  "total": 1
}
```

**Important:** Pitch `offer_rate` to the carrier. Never reveal `loadboard_rate` — it is intentionally excluded from agent search results.

---

## Tool 3: evaluate_offer

**Description:** Evaluate a carrier counter-offer. Returns accept, counter, or final rejection.

**When to use:** Each time the carrier states a dollar amount they want for a load.

**HTTP configuration:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `YOUR_API_URL/api/negotiate` |
| Headers | `Content-Type: application/json`, `X-API-Key: YOUR_API_KEY` |

**Request body:**

```json
{
  "load_id": "{{load_id}}",
  "carrier_offer": {{carrier_offer}},
  "current_round": {{current_round}},
  "call_id": "{{call_id}}"
}
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| load_id | string | yes | Load ID from search results (e.g. `LD-1001`) |
| carrier_offer | number | yes | Carrier's offered rate in dollars |
| current_round | integer | no | Negotiation round (1, 2, or 3). Server also tracks rounds via `call_id` events |
| call_id | string | no | Same call ID — logs a `negotiate` event |

**Response fields to use:**

| Field | Type | Description |
|-------|------|-------------|
| accepted | boolean | `true` = accept the deal |
| counter_offer | number\|null | Your counter rate if not accepted |
| message | string | Suggested broker response (use as guidance, speak naturally) |
| round_number | integer | Current round |
| final | boolean | `true` = no more rounds available |
| demand_posture | string | Optional: `protect_margin`, `balanced`, or `win_capacity` |
| demand_reason | string | Why the engine chose this posture |

**Broker pricing model:**

- You represent the **broker** — your goal is to pay the carrier as little as possible while still covering the load.
- Pitch `offer_rate` from search results (default ~85% of internal loadboard rate). Never reveal `loadboard_rate`.
- The engine adapts strategy based on lane demand data. If no demand data exists, balanced is used.

**Negotiation thresholds (default, balanced posture):**

| Round | Accept if within | Counter at |
|-------|-----------------|------------|
| 1 | 5% below loadboard | 97% of loadboard |
| 2 | 8% below loadboard | 94% of loadboard |
| 3 | 12% below loadboard | Final offer or reject |

Balanced allows up to **5% above loadboard** on the final round if the carrier won't come lower.

**Demand postures adjust the ladder:**

| Posture | When | Max above loadboard | Behavior |
|---------|------|--------------------:|----------|
| `protect_margin` | High demand, carriers easily find this route | **0% (never)** | Strictest — counters at 92% / 95% / 97%, hard ceiling at loadboard |
| `balanced` | Normal / no demand data (default) | **5%** | Standard table above |
| `win_capacity` | Dead routes no one is asking for | **7–10%** | Most flexible — tolerate losing margin to fill the truck |

Tune via the dashboard **Settings** page (`offer_rate_pct`, `negotiation_min_margin_pct`, per-posture config) without redeploying.

---

## Tool 4: log_call

**Description:** Log call outcome, sentiment, rates, and extracted data. **Must be called immediately when the outcome is known** — before any goodbye.

**When to use:** At every call end — booked, declined, no loads, ineligible, negotiation failed, etc.

**HTTP configuration:**

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `YOUR_API_URL/api/calls` |
| Headers | `Content-Type: application/json`, `X-API-Key: YOUR_API_KEY` |

**Request body:**

```json
{
  "call_id": "{{call_id}}",
  "carrier_mc_number": "123456",
  "carrier_name": "Werner Enterprises",
  "caller_name": "John",
  "origin_requested": "Chicago, IL",
  "destination_requested": "Dallas, TX",
  "equipment_requested": "Dry Van",
  "load_id": "LD-1001",
  "loadboard_rate": 2850.00,
  "initial_offer": 2600.00,
  "final_agreed_rate": 2750.00,
  "counter_offers": [
    {"round": 1, "carrier": 2600, "broker": 2765},
    {"round": 2, "carrier": 2750, "broker": 2750}
  ],
  "negotiation_rounds": 2,
  "outcome": "transferred",
  "sentiment": "positive",
  "notes": "Carrier accepted after 2 rounds. Driver John available in 2 hours.",
  "extracted_data": {
    "driver_name": "John",
    "truck_number": "TR-100"
  },
  "transcript_summary": "Carrier called for Chicago-Dallas dry van. MC verified. Negotiated from $2600 to $2750."
}
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| call_id | string | yes | Same ID used in all prior tool calls |
| outcome | string | yes | `booked`, `declined`, `no_loads`, `carrier_not_eligible`, `negotiation_failed`, `transferred`, `callback_requested`, or `dropped` |
| sentiment | string | yes | `positive`, `neutral`, `negative`, or `frustrated` |
| carrier_mc_number | string | no | MC number |
| carrier_name | string | no | Legal name from verification |
| caller_name | string | no | Name of person on the phone |
| origin_requested | string | no | Lane origin |
| destination_requested | string | no | Lane destination |
| equipment_requested | string | no | Equipment type |
| load_id | string | no | Load discussed |
| loadboard_rate | number | no | Internal loadboard rate (for analytics) |
| initial_offer | number | no | Carrier's first counter |
| final_agreed_rate | number | no | Agreed rate if booked |
| counter_offers | array | no | `{round, carrier, broker}` per round |
| negotiation_rounds | integer | no | Total rounds |
| notes | string | no | Brief call notes |
| extracted_data | object | no | Driver name, truck number, ETA, etc. |
| transcript_summary | string | no | 1–2 sentence summary |

---

## Tool summary

| Tool | Method | Endpoint | When |
|------|--------|----------|------|
| verify_carrier | POST | `/api/carriers/verify` | After MC number collected |
| search_loads | GET | `/api/loads/search` | After lane + equipment known |
| evaluate_offer | POST | `/api/negotiate` | Each carrier counter-offer |
| log_call | POST | `/api/calls` | Immediately when outcome is known |

**Response:** Returns the saved call record. When an outcome is set, the response includes a `closing_message` field — read this aloud as the final line (especially for `transferred`, which confirms the mock handoff to a sales rep).

---

## Dashboard-only endpoints (not HappyRobot tools)

These are used by the dashboard Web Call panel and live tracking — do not configure as agent tools:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/voice/token` | Create HappyRobot voice session |
| POST | `/api/events/call-started` | Register live call start |
| POST | `/api/events/call-ended` | Register live call end + attach transcript |
| GET | `/api/events/active` | Poll active calls |
| GET | `/api/events/transcript/session` | Get live transcript session ID |
| GET | `/api/metrics` | Dashboard analytics |
