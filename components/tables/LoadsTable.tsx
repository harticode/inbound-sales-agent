'use client';

import { useRouter } from 'next/navigation';
import type { LoadRecord } from '@/types';
import { fmtCurrency, fmtDate } from '@/lib/format';

interface Props {
  loads: LoadRecord[];
}

function statusBadge(status: string) {
  if (status === 'available') {
    return <span className="badge bg-success/15 text-success">{status}</span>;
  }
  return <span className="badge bg-surface-2 text-ink-muted">{status}</span>;
}

export default function LoadsTable({ loads }: Props) {
  const router = useRouter();

  if (loads.length === 0) {
    return (
      <div className="card py-12 text-center">
        <p className="text-sm text-ink-muted">No loads match your filters.</p>
      </div>
    );
  }

  return (
    <div className="card">
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
    </div>
  );
}
