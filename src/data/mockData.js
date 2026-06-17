const LOAD = [0.22, 0.18, 0.15, 0.14, 0.16, 0.20, 0.28, 0.42, 0.58, 0.72, 0.84, 0.92, 0.97, 1.00, 0.98, 0.94, 0.88, 0.80, 0.68, 0.55, 0.42, 0.34, 0.28, 0.24];
const HOURS = LOAD.map((_, h) => `${String(h).padStart(2, "0")}:00`);

export const mockDashboardData = {
  power: LOAD.map((load, h) => {
    const prefillKW = Math.round(load * 950 + 150);
    const decodeTotalKW = Math.round(load * 1550 + 250);
    const decodeWastedKW = Math.round(decodeTotalKW * 0.40);
    return {
      hour: HOURS[h],
      prefillKW,
      decodeNeededKW: decodeTotalKW - decodeWastedKW,
      decodeWastedKW,
    };
  }),
  leaderboard: [
    { tenant: "Acme Labs", model: "Llama-3.1-70B-Instruct", batch: 34, jpt: 3.9, wasted: 8210 },
    { tenant: "Globex AI", model: "Mixtral-8x22B", batch: 21, jpt: 4.6, wasted: 6040 },
    { tenant: "Initech", model: "Qwen2.5-72B", batch: 18, jpt: 4.1, wasted: 4380 },
    { tenant: "Soylent Data", model: "DeepSeek-V3", batch: 12, jpt: 5.2, wasted: 3190 },
    { tenant: "Hooli Infra", model: "Llama-3.1-8B (high-QPS)", batch: 64, jpt: 1.8, wasted: 2540 },
    { tenant: "Stark Compute", model: "Command-R+", batch: 15, jpt: 3.4, wasted: 2140 },
  ],
  scatter: {
    current: [
      { name: "Llama-70B", latency: 2180, energy: 3.9 },
      { name: "Mixtral-8x22B", latency: 2390, energy: 4.6 },
      { name: "Qwen2.5-72B", latency: 1950, energy: 4.1 },
      { name: "DeepSeek-V3", latency: 2340, energy: 5.2 },
      { name: "Llama-8B", latency: 980, energy: 1.8 },
      { name: "Command-R+", latency: 2050, energy: 3.4 },
    ],
    projected: [
      { name: "Llama-70B", latency: 2350, energy: 2.6 },
      { name: "Mixtral-8x22B", latency: 2480, energy: 3.1 },
      { name: "Qwen2.5-72B", latency: 2200, energy: 2.7 },
      { name: "DeepSeek-V3", latency: 2490, energy: 3.4 },
      { name: "Llama-8B", latency: 1050, energy: 1.3 },
      { name: "Command-R+", latency: 2300, energy: 2.2 },
    ],
  },
  trend: [88200, 91400, 93800, 97650, 101200, 103900, 105100, 106640].map((v, i) => ({ i, v })),
  recommendations: [
    { title: "Drop decode clock speed 18% for Llama-3.1-70B, 12am–6am", detail: "Batch sizes stay below the threshold where higher clocks help. Backtested across 30 days of traffic.", savings: 3860, risk: "none", riskLabel: "0 SLO breaches in backtest" },
    { title: "Move Mixtral-8x22B decode workers to a lower power-state profile", detail: "Memory-bound generation rarely needs peak frequency. Tested against the P99 latency target.", savings: 2910, risk: "low", riskLabel: "99.97% SLO attainment maintained" },
    { title: "Right-size the batch ceiling for Hooli Infra's high-QPS 8B model", detail: "Current ceiling leaves 1,520ms of unused latency budget at P99.", savings: 1640, risk: "none", riskLabel: "0 SLO breaches in backtest" },
    { title: "Shift Qwen2.5-72B prefill to a reserved power tier overnight", detail: "Requires enabling the power oversubscription policy on the orchestrator.", savings: 1980, risk: "medium", riskLabel: "Needs oversubscription policy" },
  ],
  overview: {
    monthlySpend: null,
    monthlyWasted: null,
    wastedPct: null,
    usefulPct: null,
    jPerToken: 3.8,
    sloAttainment: 99.96,
    activeGpus: 3140,
    gpuBreakdown: "H100 ×2,400 · A100 ×740",
  },
};

export function buildMockSnapshot(optimized = false) {
  const power = mockDashboardData.power.map((d) => ({
    ...d,
    decodeWastedKW: optimized ? Math.round(d.decodeWastedKW * 0.15) : d.decodeWastedKW,
  }));

  const n = power.length;
  const avg = (k) => power.reduce((s, d) => s + d[k], 0) / n;
  const avgTotal = avg("prefillKW") + avg("decodeNeededKW") + avg("decodeWastedKW");
  const avgWasted = avg("decodeWastedKW");
  const rate = 0.085;
  const monthlySpend = avgTotal * 720 * rate;
  const monthlyWasted = avgWasted * 720 * rate;
  const wastedPct = (monthlyWasted / monthlySpend) * 100;

  return {
    power,
    leaderboard: mockDashboardData.leaderboard.map((row) => ({
      ...row,
      wasted: optimized ? row.wasted * 0.15 : row.wasted,
      jpt: optimized ? row.jpt * 0.68 : row.jpt,
    })),
    scatter: mockDashboardData.scatter,
    trend: mockDashboardData.trend,
    recommendations: optimized
      ? mockDashboardData.recommendations.map((r) => ({ ...r, savings: Math.round(r.savings * 0.15) }))
      : mockDashboardData.recommendations,
    totals: {
      monthlySpend,
      monthlyWasted,
      wastedPct,
      usefulPct: 100 - wastedPct,
    },
    stats: [
      { label: "J / TOKEN · FLEET AVG", value: optimized ? "1.6 J" : "3.8 J", sub: optimized ? "near optimal range" : "vs 1.4–1.8 J achievable" },
      { label: "SLO ATTAINMENT", value: optimized ? "99.98%" : "99.96%", sub: "p99 ≤ 2,500ms" },
      { label: "ACTIVE GPUs", value: "3,140", sub: "H100 ×2,400 · A100 ×740" },
    ],
    totalIdentifiedSavings: mockDashboardData.recommendations.reduce((s, r) => s + r.savings, 0),
  };
}
