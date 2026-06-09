import { Target, TrendingUp } from 'lucide-react';
import type { DemandNegotiationBreakdown, NegotiationRound } from '@/types';
import { POSTURE_COLORS } from '@/lib/chart-colors';

function BreakdownBars({
  items,
  getKey,
  getLabel,
  getAttempts,
  getAccepted,
  getWinRate,
  getDiscount,
  getBarColor,
}: {
  items: Array<{
    key: string;
    label: string;
    attempts: number;
    accepted: number;
    win_rate: number;
    avg_discount_pct: number;
    barColor?: string;
  }>;
  getKey: (item: (typeof items)[number]) => string;
  getLabel: (item: (typeof items)[number]) => string;
  getAttempts: (item: (typeof items)[number]) => number;
  getAccepted: (item: (typeof items)[number]) => number;
  getWinRate: (item: (typeof items)[number]) => number;
  getDiscount: (item: (typeof items)[number]) => number;
  getBarColor?: (item: (typeof items)[number]) => string | undefined;
}) {
  const maxAttempts = Math.max(...items.map(getAttempts), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const attempts = getAttempts(item);
        const accepted = getAccepted(item);
        const barWidth = maxAttempts > 0 ? (attempts / maxAttempts) * 100 : 0;
        const wonWidth = attempts > 0 ? (accepted / attempts) * barWidth : 0;
        const discount = getDiscount(item);
        const winRate = getWinRate(item);

        return (
          <div key={getKey(item)}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{getLabel(item)}</span>
              <div className="flex items-center gap-4 text-xs text-ink-muted">
                <span>{attempts} negotiations</span>
                <span className="font-medium text-success">{accepted} won</span>
                {discount > 0 && <span className="text-warning">{discount}% discount</span>}
              </div>
            </div>
            <div className="relative h-8 overflow-hidden rounded-md bg-surface-2">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-border transition-all"
                style={{ width: `${barWidth}%` }}
              />
              <div
                className={`absolute inset-y-0 left-0 rounded-md transition-all ${getBarColor?.(item) ?? 'bg-success/30'}`}
                style={{ width: `${wonWidth}%` }}
              />
              <div className="absolute inset-0 flex items-center px-3">
                <span className="text-xs font-semibold text-ink">
                  {winRate > 0 ? `${winRate}% win rate` : 'No deals closed with this posture'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function NegotiationBreakdown({
  data,
  demandData = [],
}: {
  data: NegotiationRound[];
  demandData?: DemandNegotiationBreakdown[];
}) {
  if (!data?.length && !demandData?.length) return null;

  const roundItems = (data ?? []).map((round) => ({
    key: `round-${round.round}`,
    label: `Round ${round.round}`,
    attempts: round.attempts,
    accepted: round.accepted,
    win_rate: round.win_rate,
    avg_discount_pct: round.avg_discount_pct,
  }));

  const demandItems = (demandData ?? []).map((item) => ({
    key: item.posture,
    label: item.label,
    attempts: item.attempts,
    accepted: item.accepted,
    win_rate: item.win_rate,
    avg_discount_pct: item.avg_discount_pct,
    barColor: POSTURE_COLORS[item.posture],
  }));

  return (
    <div className="card">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-ink">
        <Target size={20} className="text-primary" />
        Negotiation Breakdown
      </h2>

      {roundItems.length > 0 && (
        <>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">By Round</p>
          <BreakdownBars
            items={roundItems}
            getKey={(item) => item.key}
            getLabel={(item) => item.label}
            getAttempts={(item) => item.attempts}
            getAccepted={(item) => item.accepted}
            getWinRate={(item) => item.win_rate}
            getDiscount={(item) => item.avg_discount_pct}
          />
        </>
      )}

      {demandItems.length > 0 && (
        <div className={roundItems.length > 0 ? 'mt-8 border-t border-border pt-6' : ''}>
          <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <TrendingUp size={14} className="text-accent-warm" />
            Demand-Based Negotiation
          </p>
          <p className="mb-3 text-xs text-ink-muted">
            How lane demand and inventory shape the agent&apos;s pricing posture
          </p>
          <BreakdownBars
            items={demandItems}
            getKey={(item) => item.key}
            getLabel={(item) => item.label}
            getAttempts={(item) => item.attempts}
            getAccepted={(item) => item.accepted}
            getWinRate={(item) => item.win_rate}
            getDiscount={(item) => item.avg_discount_pct}
            getBarColor={(item) => item.barColor ?? 'bg-success/30'}
          />
        </div>
      )}
    </div>
  );
}
