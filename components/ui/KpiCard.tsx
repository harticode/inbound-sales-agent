import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { KPI_ACCENT, KPI_ICON } from '@/lib/chart-colors';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}

const colorKeyMap: Record<string, string> = {
  blue: 'primary',
  green: 'success',
  amber: 'warning',
  red: 'danger',
  purple: 'accent',
  cyan: 'muted',
};

export default function KpiCard({ title, value, subtitle, icon, trend, trendValue, color = 'blue' }: Props) {
  const key = colorKeyMap[color] ?? 'primary';
  const accent = KPI_ACCENT[key] ?? KPI_ACCENT.primary;
  const iconColor = KPI_ICON[key] ?? KPI_ICON.primary;

  return (
    <div className={`card border-l-4 p-5 ${accent}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-muted">{title}</p>
          <p className="mt-2 truncate text-2xl font-medium tracking-tight text-ink">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>}
          {trend && trendValue && (
            <div className={`mt-1 flex items-center gap-1 text-xs ${
              trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-ink-muted'
            }`}>
              {trend === 'up' ? <ArrowUpRight size={14} /> : trend === 'down' ? <ArrowDownRight size={14} /> : null}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`shrink-0 rounded-md bg-surface-2 p-2.5 ${iconColor}`}>{icon}</div>
      </div>
    </div>
  );
}
