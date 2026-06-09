import { AlertTriangle, Gauge, MapPinned, PackageSearch, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DemandKpis, DemandProfile } from '@/types';
import { recommendationClass } from '@/lib/chart-colors';

interface Props {
  kpis: DemandKpis;
  profiles: DemandProfile[];
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMiles(value: number | null) {
  return value === null ? 'n/a' : `${value.toLocaleString()} mi`;
}

function formatCurrency(value: number | null) {
  if (value === null) return 'n/a';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function MiniKpi({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-canvas p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
          <p className="mt-2 truncate text-xl font-medium text-ink">{value}</p>
          <p className="mt-1 text-xs text-ink-muted">{detail}</p>
        </div>
        <div className="shrink-0 rounded-md bg-surface-2 p-2 text-ink-muted">{icon}</div>
      </div>
    </div>
  );
}

export default function DemandKpiPanel({ kpis, profiles }: Props) {
  if (!kpis || profiles.length === 0) {
    return (
      <div className="card">
        <h3 className="section-title mb-4">Demand Insights</h3>
        <p className="py-8 text-center text-sm text-ink-muted">No demand profiles available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="section-title">Demand Insights</h3>
          <p className="mt-1 max-w-3xl text-xs text-ink-muted">
            Auto-generated lane recommendations — what to prioritize, where rates may be uncompetitive,
            and how assertive the agent should be in negotiation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge bg-success/15 text-success">
            {kpis.premium_opportunities} ask-higher profiles
          </span>
          <span className="badge bg-warning/15 text-warning">
            {kpis.soft_negotiation_opportunities} flexible profiles
          </span>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniKpi
          label="No-Load Rate"
          value={formatPct(kpis.no_load_rate)}
          detail={`${kpis.total_requested_lanes} requested lanes`}
          icon={<PackageSearch size={18} />}
        />
        <MiniKpi
          label="Pricing Loss"
          value={formatPct(kpis.negotiation_loss_rate)}
          detail="declined or negotiation failed"
          icon={<AlertTriangle size={18} />}
        />
        <MiniKpi
          label="Top Lane"
          value={kpis.top_requested_lane}
          detail={`avg ${formatMiles(kpis.avg_requested_miles)}`}
          icon={<MapPinned size={18} />}
        />
        <MiniKpi
          label="Top Equipment"
          value={kpis.top_requested_equipment}
          detail="most requested trailer type"
          icon={<Gauge size={18} />}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="pb-3 pl-2 font-medium text-ink-muted">Demand Profile</th>
              <th className="pb-3 text-center font-medium text-ink-muted">Requests</th>
              <th className="pb-3 text-center font-medium text-ink-muted">No Loads</th>
              <th className="pb-3 text-center font-medium text-ink-muted">Booked</th>
              <th className="pb-3 text-center font-medium text-ink-muted">Avail.</th>
              <th className="pb-3 text-right font-medium text-ink-muted">Avg Miles</th>
              <th className="pb-3 text-right font-medium text-ink-muted">Avg Rate</th>
              <th className="pb-3 text-right font-medium text-ink-muted">Pickup</th>
              <th className="pb-3 pr-2 text-right font-medium text-ink-muted">Guidance</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={`${profile.lane}-${profile.equipment}`} className="border-b border-border hover:bg-surface-1">
                <td className="max-w-xs py-3 pl-2">
                  <p className="font-medium text-ink">{profile.lane}</p>
                  <p className="text-xs text-ink-muted">{profile.equipment}</p>
                </td>
                <td className="py-3 text-center text-ink">{profile.request_count}</td>
                <td className="py-3 text-center text-warning">
                  {profile.no_load_count}
                  <span className="ml-1 text-xs text-ink-muted">({formatPct(profile.no_load_rate)})</span>
                </td>
                <td className="py-3 text-center text-success">
                  {profile.booked_count}
                  <span className="ml-1 text-xs text-ink-muted">({formatPct(profile.conversion_rate)})</span>
                </td>
                <td className="py-3 text-center text-ink">{profile.available_loads}</td>
                <td className="py-3 text-right text-ink">{formatMiles(profile.avg_miles)}</td>
                <td className="py-3 text-right text-ink">
                  {formatCurrency(profile.avg_loadboard_rate)}
                </td>
                <td className="py-3 text-right text-ink">{profile.top_pickup_window ?? 'n/a'}</td>
                <td className="py-3 pr-2 text-right">
                  <span
                    title={profile.recommendation_reason}
                    className={`badge font-semibold ${recommendationClass(profile.recommendation)}`}
                  >
                    {profile.recommendation === 'raise_rate' && <TrendingUp size={12} />}
                    {profile.recommendation_label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
