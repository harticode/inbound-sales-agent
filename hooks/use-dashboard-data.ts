"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { MetricsSummary, CallRecord } from "@/types";

export function useDashboardData() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [period, setPeriod] = useState("all");

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [m, c] = await Promise.all([
          api.getMetrics(period !== "all" ? period : undefined),
          api.getCalls(100),
        ]);
        if (!cancelled) {
          setMetrics(m);
          setCalls(c);
          setLastRefresh(new Date());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchData();
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshKey, period]);

  return {
    metrics,
    calls,
    loading,
    error,
    lastRefresh,
    period,
    setPeriod,
    refresh,
  };
}
