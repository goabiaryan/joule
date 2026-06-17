import React, { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceLine,
  LabelList, LineChart, Line,
} from "recharts";
import { Zap, TrendingDown, ChevronDown, Check } from "lucide-react";
import { getDataMode, useJouleData } from "./data/useJouleData";

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

function dataSourceLabel(status) {
  if (status.mode === "live") return status.coreReachable ? "live · joule-core" : "live · mock fallback";
  if (status.mode === "shadow") return status.shadowOk ? "shadow · core ok" : "shadow · mock";
  return "mock";
}

export default function JouleDashboard() {
  const [optimized, setOptimized] = useState(false);
  const { snapshot, status } = useJouleData(optimized);
  const { power: powerData, leaderboard: LEADERBOARD, scatter, trend: TREND, recommendations: RECS, totals, stats: STATS, totalIdentifiedSavings } = snapshot;
  const { current: SCATTER_CURRENT, projected: SCATTER_PROJECTED } = scatter;

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
              Jun 1 – 17, 2026
            </div>
          </div>
        </header>

        {/* hero */}
        <section className="mt-6 rounded-2xl p-6 flex flex-wrap items-start justify-between gap-8" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div style={{ flex: "1 1 420px" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: C.inkFaint }}>POWER SPEND · THIS BILLING CYCLE</div>
            <div className="flex items-baseline gap-3 mt-2">
              <span style={{ fontFamily: MONO, fontSize: 44, fontWeight: 600, transition: "color 300ms" }}>{fmtUSD(totals.monthlySpend)}</span>
              <span style={{ fontSize: 13, color: C.inkSoft }}>/ month</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span style={{ width: 8, height: 8, borderRadius: 4, background: optimized ? C.sage : C.amber, flexShrink: 0 }} />
              <span style={{ fontFamily: MONO, fontSize: 13, color: optimized ? C.sage : C.amber }}>
                {optimized
                  ? `${fmtUSD(totals.monthlyWasted)} still in play — ${totals.wastedPct.toFixed(1)}%`
                  : `${fmtUSD(totals.monthlyWasted)} recoverable — ${totals.wastedPct.toFixed(1)}% of spend`}
              </span>
            </div>

            <div className="mt-4 rounded-full overflow-hidden" style={{ height: 10, maxWidth: 360, background: C.panel2 }}>
              <div className="flex h-full">
                <div style={{ width: `${totals.usefulPct}%`, background: C.teal, transition: "width 600ms ease" }} />
                <div style={{ width: `${totals.wastedPct}%`, background: C.amber, transition: "width 600ms ease" }} />
              </div>
            </div>
            <div className="flex gap-4 mt-2" style={{ fontSize: 11, fontFamily: MONO, color: C.inkFaint }}>
              <span><span style={{ color: C.teal }}>■</span> useful work</span>
              <span><span style={{ color: C.amber }}>■</span> {optimized ? "residual waste" : "wasted"}</span>
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
                8-wk trend <span style={{ color: C.amber }}>▲ 3.1%</span> vs last week
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
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkFaint }}>LAST 24H · KW</div>
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>
            The {optimized ? "thin" : "wide"} amber band is decode running at full clock speed while it waits on memory — power that isn’t increasing throughput.
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
                const val = row.wasted;
                const pct = (val / max) * 100;
                return (
                  <div key={row.model}>
                    <div className="flex items-baseline justify-between flex-wrap gap-1">
                      <div>
                        <span style={{ fontSize: 13 }}>{row.tenant}</span>
                        <span style={{ fontSize: 12, color: C.inkFaint }}> · {row.model}</span>
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 13, color: optimized ? C.sage : C.amber }}>{fmtUSD(val)}/mo</span>
                    </div>
                    <div className="mt-1 rounded-full overflow-hidden" style={{ height: 6, background: C.panel2 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: optimized ? C.sage : C.amber, transition: "width 500ms ease" }} />
                    </div>
                    <div className="flex gap-4 mt-1" style={{ fontSize: 11, fontFamily: MONO, color: C.inkFaint }}>
                      <span>batch {row.batch}</span>
                      <span>{row.jpt.toFixed(1)} J/tok</span>
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
              <span><span style={{ color: C.amber }}>●</span> current</span>
              <span><span style={{ color: C.teal }}>●</span> achievable within SLO</span>
            </div>
          </div>
        </section>

        {/* recommendations */}
        <section className="mt-6 rounded-2xl p-6" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>Recommended actions</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkFaint }}>{fmtUSD(totalIdentifiedSavings)}/MO IDENTIFIED</div>
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
            Synced with vLLM cluster · 3,140 GPUs · 4 regions
          </div>
          <div>{dataSourceLabel(status)} · mode {getDataMode()}</div>
        </footer>
      </div>
    </div>
  );
}
