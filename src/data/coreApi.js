const API_URL = import.meta.env.VITE_JOULE_API_URL || "";
const API_KEY = import.meta.env.VITE_JOULE_API_KEY || "";
const CLUSTER_ID = import.meta.env.VITE_JOULE_CLUSTER_ID || "";

function headers() {
  const h = { Accept: "application/json" };
  if (API_KEY) h.Authorization = `Bearer ${API_KEY}`;
  return h;
}

async function coreGet(path, params = {}) {
  const url = new URL(`${API_URL.replace(/\/$/, "")}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });

  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`joule-core ${path} failed: ${res.status}`);
  return res.json();
}

function mapPhase(rows) {
  return rows.map((row) => ({
    hour: row.hour,
    prefillKW: row.prefill_kw,
    decodeNeededKW: row.decode_needed_kw,
    decodeWastedKW: row.decode_wasted_kw,
  }));
}

function mapLeaderboard(rows) {
  return rows.map((row) => ({
    tenant: row.tenant,
    model: row.model,
    batch: row.batch,
    jpt: row.jpt,
    wasted: row.wasted,
  }));
}

function mapRecommendations(payload) {
  return {
    recommendations: payload.recommendations.map((r) => ({
      title: r.title,
      detail: r.detail,
      savings: r.savings,
      risk: r.risk,
      riskLabel: r.risk_label,
    })),
    totalIdentifiedSavings: payload.total_identified_savings,
  };
}

export function isCoreConfigured() {
  return Boolean(API_URL);
}

export async function fetchCoreSnapshot(optimized = false) {
  const params = { optimized, cluster_id: CLUSTER_ID || undefined };

  const [overview, power, leaderboard, scatter, trend, recs] = await Promise.all([
    coreGet("/v1/overview", params),
    coreGet("/v1/power/phase-timeseries", params),
    coreGet("/v1/leaderboard", params),
    coreGet("/v1/models/scatter", params),
    coreGet("/v1/spend/trend", { weeks: 8 }),
    coreGet("/v1/recommendations", params),
  ]);

  const mappedRecs = mapRecommendations(recs);

  return {
    power: mapPhase(power),
    leaderboard: mapLeaderboard(leaderboard),
    scatter: {
      current: scatter.current,
      projected: scatter.projected,
    },
    trend,
    recommendations: mappedRecs.recommendations,
    totals: {
      monthlySpend: overview.monthly_spend,
      monthlyWasted: overview.monthly_wasted,
      wastedPct: overview.wasted_pct,
      usefulPct: overview.useful_pct,
    },
    stats: [
      {
        label: "J / TOKEN · FLEET AVG",
        value: `${overview.j_per_token.toFixed(1)} J`,
        sub: optimized ? "near optimal range" : "vs 1.4–1.8 J achievable",
      },
      {
        label: "SLO ATTAINMENT",
        value: `${overview.slo_attainment.toFixed(2)}%`,
        sub: "p99 ≤ 2,500ms",
      },
      {
        label: "ACTIVE GPUs",
        value: overview.active_gpus.toLocaleString("en-US"),
        sub: overview.gpu_breakdown,
      },
    ],
    totalIdentifiedSavings: mappedRecs.totalIdentifiedSavings,
  };
}

export async function pingCore() {
  const res = await fetch(`${API_URL.replace(/\/$/, "")}/health`);
  if (!res.ok) throw new Error(`joule-core health failed: ${res.status}`);
  return res.json();
}
