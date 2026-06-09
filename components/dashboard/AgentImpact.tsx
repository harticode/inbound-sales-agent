import { Bot, Clock, DollarSign, PhoneOff, Zap, TrendingUp } from 'lucide-react';
import type { AgentImpact as AgentImpactType } from '@/types';

interface Props {
  impact: AgentImpactType;
  totalCalls: number;
}

export default function AgentImpact({ impact, totalCalls }: Props) {
  const stats = [
    {
      label: 'Hours Saved',
      value: `${impact.hours_saved}h`,
      detail: `vs ${impact.avg_handle_time_minutes}min/call with a human`,
      icon: <Clock size={18} />,
      color: 'text-primary',
    },
    {
      label: 'Cost Savings',
      value: `$${impact.cost_savings.toLocaleString()}`,
      detail: `$${impact.avg_human_cost_per_call}/call avoided`,
      icon: <DollarSign size={18} />,
      color: 'text-success',
    },
    {
      label: 'Revenue / Call',
      value: `$${impact.revenue_per_call.toLocaleString()}`,
      detail: `from ${totalCalls} automated calls`,
      icon: <TrendingUp size={18} />,
      color: 'text-accent-warm',
    },
    {
      label: 'After-Hours Calls',
      value: String(impact.calls_outside_business_hours),
      detail: 'would have been missed without AI',
      icon: <PhoneOff size={18} />,
      color: 'text-warning',
    },
  ];

  return (
    <div className="card">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-ink">
        <Bot size={20} className="text-primary" />
        Agent ROI
      </h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-canvas p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={s.color}>{s.icon}</span>
              <span className="text-xs font-medium text-ink-muted">{s.label}</span>
            </div>
            <p className="text-2xl font-medium text-ink">{s.value}</p>
            <p className="mt-1 text-xs text-ink-muted">{s.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
        <Zap size={16} className="shrink-0 text-primary" />
        <p className="text-sm text-ink">
          <span className="font-semibold">100% automation rate</span> — every call handled end-to-end without human intervention
        </p>
      </div>
    </div>
  );
}
