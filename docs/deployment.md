# Deployment Guide

Deploy the Inbound Carrier Sales platform to a cloud provider with HTTPS. Railway is the recommended path for this Docker + Postgres stack.

---

## Option A — Railway (recommended)

Railway provides automatic HTTPS, managed Postgres, and GitHub deploys.

### 1. Prerequisites

- [Railway account](https://railway.app)
- GitHub repository pushed with this code
- API keys: `API_KEY`, `FMCSA_API_KEY`, `HAPPYROBOT_API_KEY`, `HAPPYROBOT_WORKFLOW_ID`

### 2. Create project

1. Railway → **New Project** → **Deploy from GitHub repo**
2. Select your repository
3. Railway detects the [Dockerfile](../Dockerfile) automatically

### 3. Add Postgres

1. In the project, click **+ New** → **Database** → **PostgreSQL**
2. Open the Postgres service → **Variables** → copy `DATABASE_URL`
3. In the **app** service variables, set:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
   (Use Railway's variable reference syntax to link services.)

### 4. Set app environment variables

In the app service → **Variables**:

| Variable | Value |
|----------|-------|
| `API_KEY` | Long random secret (same value used in HappyRobot tool headers) |
| `FMCSA_API_KEY` | Your FMCSA SAFER API key |
| `HAPPYROBOT_API_KEY` | HappyRobot platform API key |
| `HAPPYROBOT_WORKFLOW_ID` | Workflow ID from HappyRobot editor URL |
| `ALLOWED_ORIGINS` | `https://<your-app>.up.railway.app` |
| `DASHBOARD_URL` | `https://<your-app>.up.railway.app` |
| `HAPPYROBOT_ENV` | `production` |

Optional negotiation defaults (or tune via Settings page after deploy):

```
NEGOTIATION_MIN_MARGIN_PCT=0.05
OFFER_RATE_PCT=0.85
```

### 5. Configure networking

1. App service → **Settings** → **Networking** → **Generate Domain**
2. Railway assigns `https://<name>.up.railway.app` with TLS automatically
3. Note this URL — use it for `ALLOWED_ORIGINS`, `DASHBOARD_URL`, and HappyRobot tool URLs

### 6. Deploy and verify

```bash
# Health check
curl https://<your-app>.up.railway.app/api/health
# → {"status":"ok"}

# Dashboard
open https://<your-app>.up.railway.app
```

On first boot, [docker-entrypoint.sh](../docker-entrypoint.sh) runs migrations and seeds demo data.

### 7. Update HappyRobot tools

Point all four tool URLs to your Railway domain:

```
https://<your-app>.up.railway.app/api/carriers/verify
https://<your-app>.up.railway.app/api/loads/search
https://<your-app>.up.railway.app/api/negotiate
https://<your-app>.up.railway.app/api/calls
```

---

## Option B — Local Docker (development / demo)

```bash
cp .env.example .env   # fill in keys
docker compose up --build -d
curl http://localhost/api/health
open http://localhost
```

For HappyRobot tool testing locally, expose port 80 with a tunnel:

```bash
ngrok http 80
# Use the https://*.ngrok-free.app URL as YOUR_API_URL in HappyRobot tools
```

---

## Reproduce a deployment

| Step | Command / action |
|------|------------------|
| Clone repo | `git clone <repo-url> && cd inbound-carrier-sales` |
| Configure env | `cp .env.example .env` (local) or set Railway/Fly secrets (cloud) |
| Local | `docker compose up --build -d` |
| Cloud | Connect GitHub repo to Railway → add Postgres → set variables → deploy |
| Migrate + seed | Automatic on container start via `docker-entrypoint.sh` |
| Manual migrate | `npm run db:migrate && npm run db:seed` (requires `DATABASE_URL`) |

---

## Security notes

- All agent endpoints require `X-API-Key` (see [middleware.ts](../middleware.ts))
- HTTPS is provided by Railway/Fly/ngrok — no nginx sidecar required
- Rotate `API_KEY` by updating Railway variables and HappyRobot tool headers together
- Never commit `.env` — use `.env.example` as the template

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App crashes on start | Check `DATABASE_URL` is set and Postgres is healthy |
| 401 on HappyRobot tools | `X-API-Key` in tools must match `API_KEY` in app env |
| Dashboard empty | Seed runs on first boot; check logs for migration errors |
| Web call fails | Verify `HAPPYROBOT_API_KEY` and `HAPPYROBOT_WORKFLOW_ID` |
| CORS / dashboard API errors | Set `ALLOWED_ORIGINS` to your exact HTTPS dashboard URL |

