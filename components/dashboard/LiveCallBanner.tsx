'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { CallEvent } from '@/types';

interface ActiveCall {
  call_id: string;
  started_at: string;
  last_event: CallEvent;
  event_count: number;
}

function describeLastEvent(event: CallEvent | null): string {
  if (!event) return 'Call in progress';
  const labels: Record<string, string> = {
    call_started: 'Call started',
    carrier_verify: 'Verifying carrier',
    load_search: 'Searching loads',
    negotiate: 'Negotiating',
    call_logged: 'Call logged',
  };
  return labels[event.event_type] ?? event.event_type;
}

export default function LiveCallBanner() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await api.getActiveCalls();
        if (!cancelled) setActiveCalls(data ?? []);
      } catch {
        if (!cancelled) setActiveCalls([]);
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (activeCalls.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeCalls.map((ac) => (
        <button
          key={ac.call_id}
          onClick={() => router.push(`/calls/${ac.call_id}`)}
          className="flex w-full min-h-[44px] items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-5 py-3 text-left transition-colors hover:bg-primary/10"
        >
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-medium text-ink">
            Live Call:{' '}
            <span className="font-mono">{ac.call_id}</span>
            <span className="mx-2 text-ink-muted">--</span>
            {describeLastEvent(ac.last_event)}
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs text-primary">
            View Live <ArrowRight size={14} />
          </span>
        </button>
      ))}
    </div>
  );
}
