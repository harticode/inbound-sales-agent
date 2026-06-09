"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { ActiveCall } from "@/types";

export function useActiveCalls() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const data = await api.getActiveCalls();
        if (!cancelled) setActiveCalls(data ?? []);
      } catch {
        if (!cancelled) setActiveCalls([]);
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return activeCalls;
}
