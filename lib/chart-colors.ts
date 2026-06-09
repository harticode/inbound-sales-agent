import type { CSSProperties } from 'react';
import type { DemandNegotiationBreakdown, DemandRecommendation } from '@/types';

export const CHART_COLORS = {
  primary: '#C2522D',
  success: '#5A8F6E',
  warning: '#B8860B',
  danger: '#B54A4A',
  muted: '#6B6B63',
  accent: '#D4A574',
  purple: '#8B6B8E',
  teal: '#5A8A8F',
  rose: '#A85A5A',
} as const;

export const OUTCOME_COLORS: Record<string, string> = {
  booked: CHART_COLORS.success,
  transferred: CHART_COLORS.primary,
  declined: CHART_COLORS.danger,
  negotiation_failed: CHART_COLORS.warning,
  no_loads: CHART_COLORS.purple,
  carrier_not_eligible: CHART_COLORS.muted,
  callback_requested: CHART_COLORS.teal,
  dropped: '#9A958C',
};

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: CHART_COLORS.success,
  neutral: CHART_COLORS.primary,
  negative: CHART_COLORS.danger,
  frustrated: CHART_COLORS.warning,
};

export const EQUIPMENT_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.rose,
];

export const FUNNEL_COLORS = [
  CHART_COLORS.primary,
  '#A85A3A',
  CHART_COLORS.accent,
  '#8B7355',
  CHART_COLORS.success,
];

export const POSTURE_COLORS: Record<DemandNegotiationBreakdown['posture'], string> = {
  protect_margin: 'bg-danger/15',
  balanced: 'bg-primary/15',
  win_capacity: 'bg-success/15',
};

export const outcomeBadge: Record<string, string> = {
  booked: 'bg-success/15 text-success',
  transferred: 'bg-primary/15 text-primary',
  declined: 'bg-danger/15 text-danger',
  negotiation_failed: 'bg-warning/15 text-warning',
  no_loads: 'bg-purple-500/15 text-purple-700',
  carrier_not_eligible: 'bg-ink-muted/15 text-ink-muted',
  callback_requested: 'bg-teal-700/15 text-teal-800',
  dropped: 'bg-ink-muted/10 text-ink-muted',
};

export const sentimentBadge: Record<string, string> = {
  positive: 'bg-success/15 text-success',
  neutral: 'bg-primary/15 text-primary',
  negative: 'bg-danger/15 text-danger',
  frustrated: 'bg-warning/15 text-warning',
};

export const DEFAULT_BADGE = 'bg-ink-muted/10 text-ink-muted';

export function recommendationClass(recommendation: DemandRecommendation): string {
  if (recommendation === 'raise_rate') return 'bg-success/15 text-success';
  if (recommendation === 'be_flexible') return 'bg-warning/15 text-warning';
  return 'bg-surface-2 text-ink-muted';
}

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: '#F2F0EC',
  border: '1px solid #D8D4CC',
  borderRadius: '8px',
  color: '#1A1A18',
  fontSize: '13px',
};

export const CHART_AXIS_TICK = { fill: '#6B6B63', fontSize: 12 };
export const CHART_GRID_STROKE = '#D8D4CC';

export const KPI_ACCENT: Record<string, string> = {
  primary: 'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
  accent: 'border-l-accent-warm',
  muted: 'border-l-ink-muted',
};

export const KPI_ICON: Record<string, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  accent: 'text-accent-warm',
  muted: 'text-ink-muted',
};
