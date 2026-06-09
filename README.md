# Inbound Carrier Sales — Project Delivery

**Delivered:** June 2026  
**Version:** 1.0.0  
**Stack:** Next.js 15 · PostgreSQL 16 · HappyRobot Voice Platform

---

## Overview

This package delivers a production-ready **AI inbound carrier sales platform** for freight brokerages. An AI voice agent answers carrier calls, verifies authority through FMCSA, matches loads, negotiates rates, and logs every interaction. A companion **operations dashboard** gives your team real-time visibility into call activity, negotiation outcomes, lane demand, and agent performance.

The solution is built on the **HappyRobot** voice platform with a custom backend and analytics layer you own and can deploy to your infrastructure.

### What you receive

| Deliverable | Description |
|-------------|-------------|
| **Voice agent workflow** | System prompt, tool definitions, and call flow for HappyRobot |
| **Backend API** | Carrier verification, load search, negotiation engine, call logging |
| **Operations dashboard** | KPIs, charts, live call view, web-call testing panel |
| **Database layer** | PostgreSQL schema, migrations, and seed data for demo/testing |
| **Deployment package** | Docker Compose (local) and Railway-ready production config |
| **Documentation** | Setup, deployment, agent configuration, and API reference (this repo) |

---

## Go-Live Checklist

Complete these steps to move from delivery to production.

- [ ] **Deploy the backend** — Follow the [Deployment Guide](docs/deployment.md) (Railway recommended)
- [ ] **Configure environment variables** — See [Environment Variables](#environment-variables) below
- [ ] **Create HappyRobot workflow** — Paste the [system prompt](docs/happyrobot/system-prompt.md)
- [ ] **Register API tools** — Add all four tools from [Tool Definitions](docs/happyrobot/tools.md), pointing to your deployed API URL
- [ ] **Set `X-API-Key`** — Use the same `API_KEY` value in both the app and HappyRobot tool headers
- [ ] **Publish the workflow** — Note the workflow ID for dashboard web calls (`HAPPYROBOT_WORKFLOW_ID`)
- [ ] **Verify health** — `GET /api/health` returns `{"status":"ok"}`
- [ ] **Run a test call** — Use the dashboard **Start Call** panel or HappyRobot web call
- [ ] **Review dashboard** — Confirm KPIs, call log, and live transcript populate after the test

### Test scenario (demo data)

Role-play as a carrier during your first test call:

- **MC number:** `123456`
- **Lane:** Chicago → Dallas
- **Equipment:** Dry Van

---

## Documentation

| Document | Purpose |
|----------|---------|
| [System Prompt](docs/happyrobot/system-prompt.md) | Agent instructions — copy into HappyRobot workflow |
| [Tool Definitions](docs/happyrobot/tools.md) | HTTP tool configs with request/response schemas |

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────┐
│                   HappyRobot Platform               │
│              (Voice Agent / Workflow Engine)         │
│                                                     │
│  Carrier calls in → AI verifies MC → Searches loads │
│  → Pitches load → Negotiates rate → Transfers call  │
└───────────────────┬─────────────────────────────────┘
                    │  REST API (X-API-Key)
                    ▼
┌─────────────────────────────────────────────────────┐
│         Next.js App (API Routes + Dashboard)         │
│                                                     │
│  /api/carriers/verify  ← FMCSA carrier vetting      │
│  /api/loads/search     ← Load search (agent)        │
│  /api/negotiate        ← Rate negotiation engine    │
│  /api/calls            ← Call logging & classify      │
│  /api/metrics          ← Aggregated analytics       │
│  /api/voice/token      ← Dashboard web calls        │
│  /                     ← Operations dashboard       │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
            ┌──────────────┐
            │  Postgres 16 │
            │  (loads,     │
            │   carriers,  │
            │   calls)     │
            └──────────────┘
```

---

## Features Delivered

### AI Voice Agent

- **MC verification** — FMCSA SAFER API integration with local caching
- **Load matching** — Search by origin, destination, and equipment type
- **Rate negotiation** — Up to 3 rounds with demand-aware posture
- **Call transfer** — Handoff to a sales rep upon agreement
- **Data extraction** — Driver name, truck number, availability, and more
- **Call classification** — Outcome tagging and sentiment on every call

### Operations Dashboard

- 8 KPI cards with period-over-period trends
- Outcome and sentiment charts, call volume, conversion funnel
- Rate comparison, lane demand, carrier leaderboard, peak-hours heatmap
- Lane route map with geocoding
- Demand intelligence panel with pricing recommendations
- **Live call view** — Real-time transcript streaming and event timeline
- **Web call panel** — Start voice sessions directly from the dashboard
- **Settings page** (`⚙️`) — Tune negotiation thresholds, ROI assumptions, and FMCSA cache TTL at runtime

### Security

- API key authentication (`X-API-Key` header) on all agent endpoints
- Timing-safe key comparison
- Dashboard GET requests from the same origin allowed without a key
- CORS restricted via `ALLOWED_ORIGINS`

---

## Quick Start (Local Demo)

Use this to validate the delivery on your machine before cloud deployment.

### Prerequisites

| Credential | Where to obtain |
|------------|-----------------|
| `API_KEY` | You choose — any long random secret |
| `FMCSA_API_KEY` | [FMCSA SAFER API](https://mobile.fmcsa.dot.gov/qc/services) |
| `HAPPYROBOT_API_KEY` | [HappyRobot Platform](https://platform.happyrobot.ai) → Settings → API Keys |
| `HAPPYROBOT_WORKFLOW_ID` | Workflow URL: `.../workflows/<ID>/editor/...` |
| Docker | [docker.com](https://www.docker.com) |

### Start locally

```bash
git clone <your-repo-url> && cd inbound-carrier-sales
cp .env.example .env          # fill in the keys above
docker compose up --build -d
curl http://localhost/api/health   # → {"status":"ok"}
open http://localhost              # dashboard
```

### Connect HappyRobot (local testing)

1. Expose your API publicly: `ngrok http 80`
2. Create a workflow on [platform.happyrobot.ai](https://platform.happyrobot.ai)
3. Paste the [system prompt](docs/happyrobot/system-prompt.md)
4. Add the four tools from [tools.md](docs/happyrobot/tools.md) using your ngrok HTTPS URL
5. Publish the workflow and update `HAPPYROBOT_WORKFLOW_ID` in `.env`

---

## Operator Configuration

The **Settings page** (`⚙️` in the dashboard header) stores runtime overrides in Postgres. Changes take effect on the next request — no redeploy required.

| Section | Keys | What it controls |
|---------|------|------------------|
| Negotiation strategy | `offer_rate_pct`, `negotiation_min_margin_pct`, `negotiation_posture_config` | Initial pitch %, margin floor, per-posture curves |
| Agent ROI | `agent_avg_human_handle_minutes`, `agent_avg_human_cost_per_call` | Agent Impact panel calculations |
| Carrier verification | `carrier_cache_ttl_hours` | FMCSA cache freshness |

### Negotiation defaults

Round-aware thresholds (configurable via Settings):

| Round | Accept if within | Counter at |
|-------|-----------------|------------|
| 1 | 5% of loadboard rate | 97% of rate |
| 2 | 8% of loadboard rate | 94% of rate |
| 3 | 12% of loadboard rate | Final offer or reject |

The engine also adjusts posture based on lane demand (`protect_margin`, `balanced`, `win_capacity`).

---

## API Reference

All endpoints require `X-API-Key` except `/api/health` and dashboard-origin GET requests.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check (no auth) |
| `GET` | `/api/loads` | Search loads — dashboard view (includes loadboard rate) |
| `GET` | `/api/loads/search` | Search loads — agent view (offer_rate only) |
| `GET` | `/api/loads/{load_id}` | Get specific load |
| `POST` | `/api/loads` | Create a new load |
| `POST` | `/api/carriers/verify` | Verify carrier MC via FMCSA |
| `POST` | `/api/negotiate` | Evaluate carrier counter-offer |
| `GET` | `/api/calls` | List calls (`limit`, `offset`, `outcome`, `sentiment`) |
| `POST` | `/api/calls` | Log or update a call |
| `PATCH` | `/api/calls/{call_id}` | Update call fields |
| `GET` | `/api/calls/{call_id}/detail` | Call with full event timeline |
| `GET` | `/api/metrics` | Dashboard metrics (`?period=today\|7d\|30d\|all`) |
| `POST` | `/api/voice/token` | Create HappyRobot voice session (dashboard) |
| `GET` | `/api/events/active` | List in-progress calls |
| `GET/POST` | `/api/settings` | Read/update runtime settings |

Full tool schemas for the voice agent: [docs/happyrobot/tools.md](docs/happyrobot/tools.md)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | Yes | API authentication key — must match HappyRobot tool headers |
| `FMCSA_API_KEY` | Yes | FMCSA SAFER API key |
| `HAPPYROBOT_API_KEY` | Yes (voice) | HappyRobot Platform API key |
| `HAPPYROBOT_WORKFLOW_ID` | Yes (voice) | HappyRobot workflow ID for web calls |
| `DATABASE_URL` | Yes (prod) | Postgres connection string |
| `ALLOWED_ORIGINS` | No | CORS allowed origins (comma-separated) |
| `DASHBOARD_URL` | No | Dashboard base URL (default: `http://localhost`) |
| `HAPPYROBOT_ENV` | No | `production` or `development` (default: production) |
| `NEGOTIATION_MIN_MARGIN_PCT` | No | Minimum margin (default: 0.05) |
| `OFFER_RATE_PCT` | No | Initial offer as % of loadboard (default: 0.85) |

Copy `.env.example` as a starting point. Never commit `.env` to version control.

---

## Development (Optional)

For engineering teams extending the platform:

```bash
npm install
cp .env.example .env

docker compose up -d postgres   # Postgres only
export DATABASE_URL=postgresql://carrier:carrier@localhost:5432/carrier_sales
npm run db:migrate && npm run db:seed
npm run dev   # http://localhost:3000
npm test      # Vitest unit tests
```

### Project structure

```
inbound-carrier-sales/
├── app/                         # Next.js routes + API handlers
├── components/                  # Dashboard UI (charts, tables, voice, maps)
├── services/                    # Business logic (negotiation, calls, metrics, …)
├── db/                          # Drizzle schema, client, serializers
├── docs/                        # Deployment and HappyRobot configuration
├── drizzle/migrations/          # Postgres migrations
├── scripts/                     # migrate.ts, seed.ts
├── tests/                       # Vitest unit tests
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Future Releases & Improvements

A roadmap toward a more intelligent, data-driven negotiation engine — incremental on the current codebase.

- **Signal layer** — Compute lane features (demand, seasonality, rate index), carrier features (win-rate, on-time %, revenue), and negotiation features (round, counters, offer gap) per step.
- **Posture classifier** — Replace hard-coded posture boundaries with a learned heuristic or model (e.g. logistic regression / gradient boosting) outputting a continuous tightness score `∈ [0,1]` or labels (`protect_margin` / `balanced` / `win_capacity`).
- **Price-response model** — Estimate `P(win | price, context)` from historical negotiations; use it to score accept vs. counter candidates.
- **Decision policy** — Pick the action that maximises expected value: `EV = P(win) × margin − risk_penalty`, subject to min-margin, over-market caps, and posture bands.


---

## Support & Handoff Notes

**Security reminders**

- Rotate `API_KEY` by updating both Railway/app env and HappyRobot tool headers together
- Keep `FMCSA_API_KEY` and `HAPPYROBOT_API_KEY` in secrets management — not in source control
- Set `ALLOWED_ORIGINS` to your exact production dashboard URL after deploy

For deployment issues, see the troubleshooting table in [docs/deployment.md](docs/deployment.md).

---

*Inbound Carrier Sales Platform — delivered as a turnkey AI automation solution for freight brokerage inbound call handling.*
