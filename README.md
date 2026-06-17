# Joule Dashboard

Power intelligence dashboard for GPU inference fleets. Surfaces recoverable spend, inference-phase power draw, model-level waste rankings, and optimization recommendations — the value layer on top of Joule's telemetry and simulation stack.

**Private repository.**

## What this is

Joule helps teams running large GPU fleets (vLLM, SGLang, Triton) answer three questions:

1. **How much power spend is wasted?** Decode-phase draw at peak clock while memory-bound — power that isn't increasing throughput.
2. **Where is it coming from?** Per-tenant, per-model breakdown ranked by recoverable dollars.
3. **What can we do about it?** Backtested policy recommendations with SLO risk labels.

This repo is the **dashboard** — the React frontend customers see. It does not collect telemetry or run simulations itself.

## Ecosystem

Joule is split across three repositories:

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   joule-agent       │     │   joule-core        │     │   joule (this repo) │
│   PUBLIC · OSS      │────▶│   PRIVATE           │────▶│   PRIVATE           │
│                     │     │                     │     │                     │
│  Telemetry collector│     │  Simulation engine  │     │  React dashboard    │
│  NVML + vLLM hooks  │     │  Waste classifier   │     │  Netlify deploy     │
│  Apache 2.0         │     │  FastAPI + SQLite   │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                            │                            │
    GPU nodes                   API + analytics                  Browser
```

| Repo | Visibility | Role |
|---|---|---|
| [joule-agent](https://github.com/goabiaryan/joule-agent) | Public | Auditable Python agent on inference nodes |
| [joule-core](https://github.com/goabiaryan/joule-core) | Private | Proprietary classification + simulation API |
| **joule** | Private | Dashboard UI (this repo) |

The open/closed boundary is intentional: customers can audit what leaves their perimeter (`joule-agent`), while the IP that drives recommendations stays closed (`joule-core`).

## Dashboard views

| Section | What it shows |
|---|---|
| **Power spend hero** | Monthly spend, recoverable waste %, useful vs wasted split |
| **Phase chart** | 24h stacked area: prefill, decode (needed), decode (wasted) |
| **Leaderboard** | Top waste sources by tenant/model with batch size and J/token |
| **Scatter plot** | Energy vs P99 latency — current vs achievable within SLO |
| **Recommendations** | Ranked optimization actions with savings and backtest risk |
| **Optimized toggle** | Preview fleet state after applying recommended policies |

## Tech stack

- **React 19** + **Vite 7**
- **Recharts** for charts
- **Tailwind CSS 4** for layout
- **Lucide** for icons
- **Netlify** for production hosting

## Quick start

```bash
git clone https://github.com/goabiaryan/joule.git
cd joule
npm install
npm run dev
```

Open http://localhost:5173 — runs in **mock mode** by default with demo data.

## Data modes

The dashboard supports three data source modes via `VITE_JOULE_DATA_MODE`:

| Mode | Display | API calls | Use when |
|---|---|---|---|
| `mock` | Static demo data | None | Default. Demos, Netlify prod before core is deployed |
| `shadow` | Mock data | Background fetch to joule-core | Validating API wiring without changing what users see |
| `live` | joule-core data | Full | Production with deployed joule-core |

Copy the example env file:

```bash
cp .env.example .env.local
```

### Mock (default)

```bash
VITE_JOULE_DATA_MODE=mock
```

No backend required. All charts render from `src/data/mockData.js`.

### Shadow

Shows mock data to users while fetching joule-core in the background. Footer displays `shadow · core ok` when the binding works.

```bash
# terminal 1 — start joule-core
cd ../joule-core
pip install -e .
export JOULE_API_KEY=dev-key
joule-api

# terminal 2 — dashboard in shadow mode
cd joule
cp .env.example .env.local
```

Set in `.env.local`:

```bash
VITE_JOULE_DATA_MODE=shadow
VITE_JOULE_API_URL=http://127.0.0.1:8000
VITE_JOULE_API_KEY=dev-key
```

Check the browser console for shadow fetch errors. The UI stays on mock data regardless.

### Live

joule-core becomes the source of truth. Falls back to mock if the API is unreachable.

```bash
VITE_JOULE_DATA_MODE=live
VITE_JOULE_API_URL=https://your-joule-core.example.com
VITE_JOULE_API_KEY=your-production-key
VITE_JOULE_CLUSTER_ID=lisbon-prod-1
```

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_JOULE_DATA_MODE` | No | `mock` | `mock`, `shadow`, or `live` |
| `VITE_JOULE_API_URL` | Shadow/live | — | joule-core base URL |
| `VITE_JOULE_API_KEY` | Shadow/live | — | Bearer token for API auth |
| `VITE_JOULE_CLUSTER_ID` | No | — | Filter metrics to a specific cluster |

Vite inlines these at build time. For Netlify, set them in **Site settings → Environment variables** before deploying.

## API endpoints consumed

When in `shadow` or `live` mode, the dashboard calls these joule-core endpoints (see `src/data/coreApi.js`):

| Endpoint | Dashboard section |
|---|---|
| `GET /v1/overview` | Hero spend + stats |
| `GET /v1/power/phase-timeseries` | Phase chart |
| `GET /v1/leaderboard` | Waste leaderboard |
| `GET /v1/models/scatter` | Energy vs latency scatter |
| `GET /v1/spend/trend` | 8-week spend sparkline |
| `GET /v1/recommendations` | Recommended actions |
| `GET /health` | Connectivity check |

Field names are mapped from joule-core's snake_case API to the dashboard's camelCase internally.

## Project structure

```
joule/
├── src/
│   ├── joule-dashboard.jsx   # Main dashboard component
│   ├── main.jsx              # React entry point
│   ├── index.css             # Tailwind imports
│   └── data/
│       ├── mockData.js       # Demo data + snapshot builder
│       ├── coreApi.js        # joule-core client + field mapping
│       └── useJouleData.js   # mock / shadow / live hook
├── index.html
├── vite.config.js
├── netlify.toml              # Build + SPA redirect config
├── .env.example              # Environment variable template
└── package.json
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |

## Deploy to Netlify

Connected via GitHub — pushes to `main` trigger automatic builds.

Build settings (also in `netlify.toml`):

- **Build command:** `npm run build`
- **Publish directory:** `dist`

### Production env vars (when joule-core is ready)

```
VITE_JOULE_DATA_MODE=live
VITE_JOULE_API_URL=https://api.your-joule-instance.com
VITE_JOULE_API_KEY=<secret>
```

Until joule-core is deployed, leave `VITE_JOULE_DATA_MODE=mock` (or unset) and the dashboard works standalone with demo data.

### CORS

joule-core must allow your Netlify origin. Set on the core server:

```bash
JOULE_CORS_ORIGINS=https://your-site.netlify.app
```

## End-to-end flow (production)

```
1. Customer installs joule-agent on GPU nodes
        ↓ POST /v1/events
2. joule-core ingests telemetry, runs classification nightly
        ↓ GET /v1/*
3. joule dashboard renders live metrics
        ↓
4. Customer sees recoverable spend → advisory sprint → ongoing savings
```

## Development notes

- The **optimized toggle** re-fetches from joule-core with `optimized=true` in live/shadow modes.
- Footer shows current data mode: `mock`, `shadow · core ok`, or `live · joule-core`.
- Mock data in `mockData.js` mirrors the original dashboard prototype — useful as a reference for API response shapes.

## Related repos

- **Agent (install on GPU nodes):** https://github.com/goabiaryan/joule-agent
- **Core (API + simulation):** https://github.com/goabiaryan/joule-core
- **Dashboard (this repo):** https://github.com/goabiaryan/joule

## License

Proprietary. All rights reserved.
