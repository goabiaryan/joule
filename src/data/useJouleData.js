import { useEffect, useMemo, useState } from "react";
import { buildMockSnapshot } from "./mockData";
import { fetchCoreSnapshot, isCoreConfigured, pingCore } from "./coreApi";

// mock    — static demo data (default)
// shadow  — show mock, fetch joule-core in background to validate wiring
// live    — joule-core is source of truth, fall back to mock on error
const DATA_MODE = import.meta.env.VITE_JOULE_DATA_MODE || "mock";

export function getDataMode() {
  return DATA_MODE;
}

export function useJouleData(optimized) {
  const mockSnapshot = useMemo(() => buildMockSnapshot(optimized), [optimized]);
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [status, setStatus] = useState({
    mode: DATA_MODE,
    coreReachable: null,
    shadowOk: null,
    error: null,
    lastFetchedAt: null,
  });

  useEffect(() => {
    if (!isCoreConfigured() || DATA_MODE === "mock") {
      setStatus((s) => ({ ...s, mode: DATA_MODE, coreReachable: false }));
      return;
    }

    let cancelled = false;

    async function loadCore() {
      try {
        await pingCore();
        const snapshot = await fetchCoreSnapshot(optimized);
        if (cancelled) return;

        setLiveSnapshot(snapshot);
        setStatus({
          mode: DATA_MODE,
          coreReachable: true,
          shadowOk: true,
          error: null,
          lastFetchedAt: new Date().toISOString(),
        });
      } catch (err) {
        if (cancelled) return;
        setLiveSnapshot(null);
        setStatus({
          mode: DATA_MODE,
          coreReachable: false,
          shadowOk: false,
          error: err instanceof Error ? err.message : "joule-core unavailable",
          lastFetchedAt: new Date().toISOString(),
        });
        if (DATA_MODE === "shadow") {
          console.warn("[joule] shadow fetch failed — still serving mock data", err);
        }
      }
    }

    loadCore();
    return () => {
      cancelled = true;
    };
  }, [optimized]);

  const snapshot =
    DATA_MODE === "live" && liveSnapshot
      ? liveSnapshot
      : mockSnapshot;

  return { snapshot, status, mockSnapshot, liveSnapshot };
}
