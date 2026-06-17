import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceLine,
  LabelList, LineChart, Line,
} from "recharts";
import { Zap, TrendingDown, ChevronDown, Check } from "lucide-react";

const C = {
  bg: "#12151b",
  panel: "#1b1f28",
  panel2: "#20242e",
  border: "#2b303b",
  ink: "#EDE8DC",
  inkSoft: "#9aa1ad",
  inkFaint: "#5c6270",
  amber: "#E0653B",
  gold: "#C9A06B",
  teal: "#4FB8AE",
  sage: "#86AE7D",
};

const MONO = '"IBM Plex Mono", "SFMono-Regular", monospace';
const SANS = '"IBM Plex Sans", "Inter", sans-serif';

const LOAD = [0.22,0.18,0.15,0.14,0.16,0.20,0.28,0.42,0.58,0.72,0.84,0.92,0.97,1.00,0.98,0.94,0.88,0.80,0.68,0.55,0.42,0.34,0.28,0.24];
const HOURS = LOAD.map((_, h) => `${String(h).padStart(2, "0")}:00`);

const BASE_POWER = LOAD.map((load, h) => {
  const prefillKW = Math.round(load * 950 + 150);
  const decodeTotalKW = Math.round(load * 1550 + 250);
  const decodeWastedKW = Math.round(decodeTotalKW * 0.40);
  return {
    hour: HOURS[h],
    prefillKW,
    decodeNeededKW: decodeTotalKW - decodeWastedKW,
    decodeWastedKW,
  };
});

const LEADERBOARD = [
  { tenant: "Acme Labs", model: "Llama-3.1-70B-Instruct", batch: 34, jpt: 3.9, wasted: 8210 },
  { tenant: "Globex AI", model: "Mixtral-8x22B", batch: 21, jpt: 4.6, wasted: 6040 },
  { tenant: "Initech", model: "Qwen2.5-72B", batch: 18, jpt: 4.1, wasted: 4380 },
  { tenant: "Soylent Data", model: "DeepSeek-V3", batch: 12, jpt: 5.2, wasted: 3190 },
  { tenant: "Hooli Infra", model: "Llama-3.1-8B (high-QPS)", batch: 64, jpt: 1.8, wasted: 2540 },
  { tenant: "Stark Compute", model: "Command-R+", batch: 15, jpt: 3.4, wasted: 2140 },
];

const SCATTER_CURRENT = [
  { name: "Llama-70B", latency: 2180, energy: 3.9 },
  { name: "Mixtral-8x22B", latency: 2390, energy: 4.6 },
  { name: "Qwen2.5-72B", latency: 1950, energy: 4.1 },
  { name: "DeepSeek-V3", latency: 2340, energy: 5.2 },
  { name: "Llama-8B", latency: 980, energy: 1.8 },
  { name: "Command-R+", latency: 2050, energy: 3.4 },
];

const SCATTER_PROJECTED = [
  { name: "Llama-70B", latency: 2350, energy: 2.6 },
  { name: "Mixtral-8x22B", latency: 2480, energy: 3.1 },
  { name: "Qwen2.5-72B", latency: 2200, energy: 2.7 },
  { name: "DeepSeek-V3", latency: 2490, energy: 3.4 },
  { name: "Llama-8B", latency: 1050, energy: 1.3 },
  { name: "Command-R+", latency: 2300, energy: 2.2 },
];

const TREND = [88200, 91400, 93800, 97650, 101200, 103900, 105100, 106640].map((v, i) => ({ i, v }));

const RECS = [
  { title: "Drop decode clock speed 18% for Llama-3.1-70B, 12am\u20136am", detail: "Batch sizes stay below the threshold where higher clocks help. Backtested across 30 days of traffic.", savings: 3860, risk: "none", riskLabel: "0 SLO breaches in backtest" },
  { title: "Move Mixtral-8x22B decode workers to a lower power-state profile", detail: "Memory-bound generation rarely needs peak frequency. Tested against the P99 latency target.", savings: 2910, risk: "low", riskLabel: "99.97% SLO attainment maintained" },
  { title: "Right-size the batch ceiling for Hooli Infra's high-QPS 8B model", detail: "Current ceiling leaves 1,520ms of unused latency budget at P99.", savings: 1640, risk: "none", riskLabel: "0 SLO breaches in backtest" },
  { title: "Shift Qwen2.5-72B prefill to a reserved power tier overnight", detail: "Requires enabling the power oversubscription policy on the orchestrator.", savings: 1980, risk: "medium", riskLabel: "Needs oversubscription policy" },
];

const fmtUSD = (n) => "$" + Math.round(n).toLocaleString("en-US");

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontFamily: MONO, fontSize: 12 }}>
      {label && <div style={{ color: C.inkSoft, marginBottom: 6 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, color: C.ink }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function JouleDashboard() {
  const [optimized, setOptimized] = useState(false);

  const powerData = useMemo(
    () => BASE_POWER.map((d) => ({ ...d, decodeWastedKW: optimized ? Math.round(d.decodeWastedKW * 0.15) : d.decodeWastedKW })),
    [optimized]
  );

  const totals = useMemo(() => {
    const n = powerData.length;
    const avg = (k) => powerData.reduce((s, d) => s + d[k], 0) / n;
    const avgTotal = avg("prefillKW") + avg("decodeNeededKW") + avg("decodeWastedKW");
    const avgWasted = avg("decodeWastedKW");
    const rate = 0.085;
    const monthlySpend = avgTotal * 720 * rate;
    const monthlyWasted = avgWasted * 720 * rate;
    const wastedPct = (monthlyWasted / monthlySpend) * 100;
    return { monthlySpend, monthlyWasted, wastedPct, usefulPct: 100 - wastedPct };
  }, [powerData]);

  const STATS = [
    { label: "J / TOKEN \u00b7 FLEET AVG", value: optimized ? "1.6 J" : "3.8 J", sub: optimized ? "near optimal range" : "vs 1.4\u20131.8 J achievable" },
    { label: "SLO ATTAINMENT", value: optimized ? "99.98%" : "99.96%", sub: "p99 \u2264 2,500ms" },
    { label: "ACTIVE GPUs", value: "3,140", sub: "H100 \u00d72,400 \u00b7 A100 \u00d7740" },
  ];

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: SANS, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');`}</style>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* header */}
        <header className="flex items-center justify-between flex-wrap gap-4 pb-5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div style={{ width: 30, height: 30, borderRadius: 7, background: C.amber, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap size={16} color={C.bg} />
            </div>
            <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 16, letterSpacing: "0.02em" }}>JOULE</div>
            <span className="hidden md:inline" style={{ fontSize: 12, color: C.inkFaint }}>Power intelligence for GPU fleets</span>
            <nav className="hidden lg:flex items-center gap-5 ml-4">
              {["Overview", "Fleet", "Models", "Alerts"].map((t, i) => (
                <span key={t} style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.05em", color: i === 0 ? C.ink : C.inkFaint, borderBottom: i === 0 ? `2px solid ${C.amber}` : "2px solid transparent", paddingBottom: 6 }}>
                  {t.toUpperCase()}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: MONO, color: C.inkSoft }}>
              All clusters <ChevronDown size={13} />
            </div>
            <div className="px-3 py-1.5 rounded-lg" style={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: MONO, color: C.inkSoft }}>
              Jun 1 \u2013 17, 2026
            </div>
          </div>
        </header>

        {/* hero */}
        <section className="mt-6 rounded-2xl p-6 flex flex-wrap items-start justify-between gap-8" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div style={{ flex: "1 1 420px" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: C.inkFaint }}>POWER SPEND \u00b7 THIS BILLING CYCLE</div>
            <div className="flex items-baseline gap-3 mt-2">
              <span style={{ fontFamily: MONO, fontSize: 44, fontWeight: 600, transition: "color 300ms" }}>{fmtUSD(totals.monthlySpend)}</span>
              <span style={{ fontSize: 13, color: C.inkSoft }}>/ month</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span style={{ width: 8, height: 8, borderRadius: 4, background: optimized ? C.sage : C.amber, flexShrink: 0 }} />
              <span style={{ fontFamily: MONO, fontSize: 13, color: optimized ? C.sage : C.amber }}>
                {optimized
                  ? `${fmtUSD(totals.monthlyWasted)} still in play \u2014 ${totals.wastedPct.toFixed(1)}%`
                  : `${fmtUSD(totals.monthlyWasted)} recoverable \u2014 ${totals.wastedPct.toFixed(1)}% of spend`}
              </span>
            </div>

            <div className="mt-4 rounded-full overflow-hidden" style={{ height: 10, maxWidth: 360, background: C.panel2 }}>
              <div className="flex h-full">
                <div style={{ width: `${totals.usefulPct}%`, background: C.teal, transition: "width 600ms ease" }} />
                <div style={{ width: `${totals.wastedPct}%`, background: C.amber, transition: "width 600ms ease" }} />
              </div>
            </div>
            <div className="flex gap-4 mt-2" style={{ fontSize: 11, fontFamily: MONO, color: C.inkFaint }}>
              <span><span style={{ color: C.teal }}>\u25a0</span> useful work</span>
              <span><span style={{ color: C.amber }}>\u25a0</span> {optimized ? "residual waste" : "wasted"}</span>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <div style={{ width: 120, height: 30 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={TREND}>
                    <Line type="monotone" dataKey="v" stroke={C.inkFaint} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: 11, fontFamily: MONO, color: C.inkFaint }}>
                8-wk trend <span style={{ color: C.amber }}>\u25b2 3.1%</span> vs last week
              </div>
            </div>
          </div>

          <div style={{ flex: "0 0 auto" }} className="flex flex-col items-stretch gap-3">
            <button
              onClick={() => setOptimized((v) => !v)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: optimized ? C.sage : C.panel2, border: `1px solid ${optimized ? C.sage : C.border}`, color: optimized ? C.bg : C.ink, fontFamily: MONO, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {optimized ? <Check size={14} /> : <Zap size={14} />}
              {optimized ? "Optimization active" : "Preview optimized state"}
            </button>
            <div className="grid grid-cols-3 gap-2">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-xl px-3 py-2" style={{ background: C.panel2, border: `1px solid ${C.border}`, minWidth: 96 }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.06em", color: C.inkFaint }}>{s.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 600, marginTop: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* phase chart */}
        <section className="mt-6 rounded-2xl p-6" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>Power draw by inference phase</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkFaint }}>LAST 24H \u00b7 KW</div>
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>
            The {optimized ? "thin" : "wide"} amber band is decode running at full clock speed while it waits on memory \u2014 power that isn\u2019t increasing throughput.
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={powerData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" interval={3} tick={{ fill: C.inkFaint, fontSize: 11, fontFamily: MONO }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fill: C.inkFaint, fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="prefillKW" name="Prefill" stackId="1" stroke={C.teal} fill={C.teal} fillOpacity={0.85} />
                <Area type="monotone" dataKey="decodeNeededKW" name="Decode (needed)" stackId="1" stroke={C.gold} fill={C.gold} fillOpacity={0.75} />
                <Area type="monotone" dataKey="decodeWastedKW" name="Decode (wasted)" stackId="1" stroke={C.amber} fill={C.amber} fillOpacity={0.9} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* leaderboard + scatter */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 rounded-2xl p-6" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Where it's coming from</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 14 }}>Ranked by {optimized ? "recovered" : "recoverable"} spend this cycle</div>
            <div className="flex flex-col gap-3">
              {LEADERBOARD.map((row) => {
                const max = LEADERBOARD[0].wasted;
                const val = optimized ? row.wasted * 0.15 : row.wasted;
                const pct = (val / max) * 100;
                return (
                  <div key={row.model}>
                    <div className="flex items-baseline justify-between flex-wrap gap-1">
                      <div>
                        <span style={{ fontSize: 13 }}>{row.tenant}</span>
                        <span style={{ fontSize: 12, color: C.inkFaint }}> \u00b7 {row.model}</span>
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 13, color: optimized ? C.sage : C.amber }}>{fmtUSD(val)}/mo</span>
                    </div>
                    <div className="mt-1 rounded-full overflow-hidden" style={{ height: 6, background: C.panel2 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: optimized ? C.sage : C.amber, transition: "width 500ms ease" }} />
                    </div>
                    <div className="flex gap-4 mt-1" style={{ fontSize: 11, fontFamily: MONO, color: C.inkFaint }}>
                      <span>batch {row.batch}</span>
                      <span>{row.jpt} J/tok</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Energy vs. latency headroom</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>Every model sits well inside the SLO boundary</div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="latency" name="P99 latency" unit="ms" domain={[800, 2800]} tick={{ fill: C.inkFaint, fontSize: 10, fontFamily: MONO }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <YAxis type="number" dataKey="energy" name="J/token" domain={[0, 6]} tick={{ fill: C.inkFaint, fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
                  <ReferenceLine x={2500} stroke={C.inkFaint} strokeDasharray="4 4" label={{ value: "SLO 2,500ms", position: "top", fill: C.inkFaint, fontSize: 10, fontFamily: MONO }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter name="Current" data={SCATTER_CURRENT} fill={C.amber}>
                    <LabelList dataKey="name" position="top" style={{ fontFamily: MONO, fontSize: 9, fill: C.inkSoft }} />
                  </Scatter>
                  <Scatter name="Achievable" data={SCATTER_PROJECTED} fill={C.teal} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2" style={{ fontSize: 11, fontFamily: MONO, color: C.inkFaint }}>
              <span><span style={{ color: C.amber }}>\u25cf</span> current</span>
              <span><span style={{ color: C.teal }}>\u25cf</span> achievable within SLO</span>
            </div>
          </div>
        </section>

        {/* recommendations */}
        <section className="mt-6 rounded-2xl p-6" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>Recommended actions</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkFaint }}>{fmtUSD(RECS.reduce((s, r) => s + r.savings, 0))}/MO IDENTIFIED</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RECS.map((r, i) => (
              <div key={i} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: C.panel2, border: `1px solid ${C.border}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}>{r.title}</div>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: optimized ? "rgba(134,174,125,0.15)" : "rgba(224,101,59,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {optimized ? <Check size={14} color={C.sage} /> : <TrendingDown size={14} color={C.amber} />}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.inkSoft }}>{r.detail}</div>
                <div className="flex items-center justify-between mt-1">
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: optimized ? C.sage : C.amber }}>{fmtUSD(r.savings)}/mo</span>
                  <span style={{ fontSize: 11, fontFamily: MONO, color: r.risk === "medium" ? "#D9A05B" : C.inkFaint }}>{r.riskLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* footer */}
        <footer className="mt-6 flex items-center justify-between flex-wrap gap-2 py-4" style={{ borderTop: `1px solid ${C.border}`, fontSize: 11, fontFamily: MONO, color: C.inkFaint }}>
          <div className="flex items-center gap-2">
            <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: 3, background: C.sage, display: "inline-block" }} />
            Synced with vLLM cluster \u00b7 3,140 GPUs \u00b7 4 regions
          </div>
          <div>Last updated 2 min ago</div>
        </footer>
      </div>
    </div>
  );
}
