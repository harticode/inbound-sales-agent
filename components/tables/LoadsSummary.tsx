'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { LoadRecord } from '@/types';
import { fmtCurrency, fmtDate } from '@/lib/format';

const PREVIEW_LIMIT = 8;

function statusBadge(status: string) {
  if (status === 'available') {
    return <span className="badge bg-success/15 text-success">{status}</span>;
  }
  return <span className="badge bg-surface-2 text-ink-muted">{status}</span>;
}

export default function LoadsSummary() {
  const router = useRouter();
  const [loads, setLoads] = useState<LoadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLoads() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getLoads();
      setLoads(result.loads.slice(0, PREVIEW_LIMIT));
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLoads();
  }, []);

  if (loading) {
    return (
      <div className="card flex h-32 items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-danger/30 bg-danger/5 p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button onClick={fetchLoads} className="btn-ghost mt-3 text-danger">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="section-title">Available Loads</h3>
        <span className="text-xs text-ink-muted">{total} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="pb-3 pl-2 font-medium text-ink-muted">Load ID</th>
              <th className="pb-3 font-medium text-ink-muted">Lane</th>
              <th className="pb-3 font-medium text-ink-muted">Equipment</th>
              <th className="pb-3 font-medium text-ink-muted">Pickup</th>
              <th className="pb-3 text-right font-medium text-ink-muted">Loadboard</th>
              <th className="pb-3 text-right font-medium text-ink-muted">Offer</th>
              <th className="pb-3 pr-2 text-center font-medium text-ink-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => (
              <tr
                key={load.load_id}
                onClick={() => router.push(`/loads/${encodeURIComponent(load.load_id)}`)}
                className="cursor-pointer border-b border-border hover:bg-surface-1"
              >
                <td className="py-3 pl-2 font-mono font-medium text-primary">{load.load_id}</td>
                <td className="py-3 text-ink">
                  {load.origin} → {load.destination}
                </td>
                <td className="py-3 text-ink-muted">{load.equipment_type}</td>
                <td className="py-3 text-ink-muted">{fmtDate(load.pickup_datetime)}</td>
                <td className="py-3 text-right text-ink">{fmtCurrency(load.loadboard_rate)}</td>
                <td className="py-3 text-right text-primary">{fmtCurrency(load.offer_rate)}</td>
                <td className="py-3 pr-2 text-center">{statusBadge(load.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <Link href="/loads" className="btn-ghost text-primary">
          View all loads
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
