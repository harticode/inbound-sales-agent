'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Truck, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { LoadRecord } from '@/types';
import { fmtCurrency, fmtDateTime, fmtWeight } from '@/lib/format';

function statusBadge(status: string) {
  if (status === 'available') {
    return <span className="badge bg-success/15 font-semibold text-success">{status}</span>;
  }
  return <span className="badge bg-surface-2 font-semibold text-ink-muted">{status}</span>;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}

export default function LoadDetailClient({ loadId }: { loadId: string }) {
  const router = useRouter();
  const [load, setLoad] = useState<LoadRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLoad() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getLoad(loadId);
        if (!cancelled) setLoad(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLoad();
    return () => { cancelled = true; };
  }, [loadId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-16 lg:py-24">
        <div className="flex h-64 items-center justify-center">
          <RefreshCw size={32} className="animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (error || !load) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-16 lg:py-24">
        <button
          onClick={() => router.push('/loads')}
          className="mb-6 flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} /> Back to Loads
        </button>
        <div className="card border-danger/30 bg-danger/5 p-8 text-center">
          <h2 className="text-xl font-medium text-danger">Failed to load</h2>
          <p className="mt-2 text-sm text-danger">{error ?? 'Load not found'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1200px] space-y-6 px-6 py-16 lg:py-24">
      <button
        onClick={() => router.push('/loads')}
        className="flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> Back to Loads
      </button>

      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
              <Truck className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="font-mono text-lg font-medium text-ink">{load.load_id}</h2>
              <p className="text-sm text-ink-muted">
                {load.origin} → {load.destination} · {load.equipment_type}
              </p>
            </div>
          </div>
          <div className="ml-auto">{statusBadge(load.status)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="section-title mb-3">Schedule & Rates</h3>
          <div className="space-y-2 text-sm">
            <DetailRow label="Pickup" value={fmtDateTime(load.pickup_datetime)} />
            <DetailRow label="Delivery" value={fmtDateTime(load.delivery_datetime)} />
            <DetailRow
              label="Miles"
              value={load.miles != null ? load.miles.toLocaleString() : '—'}
            />
            <DetailRow label="Loadboard Rate" value={fmtCurrency(load.loadboard_rate)} />
            <DetailRow label="Initial Offer" value={fmtCurrency(load.offer_rate)} />
            <p className="pt-1 text-xs text-ink-muted">
              Initial offer is the rate the voice agent pitches to carriers.
            </p>
            <DetailRow label="Created" value={fmtDateTime(load.created_at)} />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title mb-3">Cargo Details</h3>
          <div className="space-y-2 text-sm">
            <DetailRow label="Weight" value={fmtWeight(load.weight)} />
            <DetailRow label="Commodity" value={load.commodity_type || '—'} />
            <DetailRow
              label="Pieces"
              value={load.num_of_pieces != null ? load.num_of_pieces.toLocaleString() : '—'}
            />
            <DetailRow label="Dimensions" value={load.dimensions || '—'} />
          </div>
        </div>
      </div>

      {load.notes && (
        <div className="card">
          <h3 className="section-title mb-3">Notes</h3>
          <p className="text-sm leading-relaxed text-ink">{load.notes}</p>
        </div>
      )}
    </main>
  );
}
