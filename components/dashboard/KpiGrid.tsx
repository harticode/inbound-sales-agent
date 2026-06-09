import {
  Phone, CheckCircle, XCircle, DollarSign, Clock, TrendingUp,
  ShieldCheck, AlertTriangle,
} from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import KpiSection from "@/components/dashboard/KpiSection";
import { pctChange, trendDir } from "@/lib/utils";
import type { MetricsSummary } from "@/types";

interface Props {
  metrics: MetricsSummary;
}

export default function KpiGrid({ metrics }: Props) {
  const prev = metrics.period_comparison;

  return (
    <div className="space-y-8">
      <KpiSection
        title="Call volume & outcomes"
        description="Inbound volume, conversion results, and revenue won."
      >
        <KpiCard
          title="Total Calls"
          value={metrics.total_calls}
          icon={<Phone size={20} />}
          color="blue"
          trend={prev ? trendDir(metrics.total_calls, prev.total_calls_prev) : undefined}
          trendValue={prev ? pctChange(metrics.total_calls, prev.total_calls_prev) : undefined}
        />
        <KpiCard
          title="Booked"
          value={metrics.total_booked}
          subtitle={`${(metrics.booking_rate * 100).toFixed(1)}% booking rate`}
          icon={<CheckCircle size={20} />}
          color="green"
          trend={prev ? trendDir(metrics.total_booked, prev.total_booked_prev) : undefined}
          trendValue={prev ? pctChange(metrics.total_booked, prev.total_booked_prev) : undefined}
        />
        <KpiCard
          title="Declined"
          value={metrics.total_declined}
          icon={<XCircle size={20} />}
          color="red"
        />
        <KpiCard
          title="Revenue Booked"
          value={`$${metrics.total_revenue_booked.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          color="purple"
          trend={prev ? trendDir(metrics.total_revenue_booked, prev.revenue_prev) : undefined}
          trendValue={prev ? pctChange(metrics.total_revenue_booked, prev.revenue_prev) : undefined}
        />
      </KpiSection>

      <KpiSection
        title="Pricing & margin"
        description="Broker margin captured, revenue left on the table, and negotiation intensity."
      >
        <KpiCard
          title="Margin Saved"
          value={`$${metrics.total_margin_saved.toLocaleString()}`}
          subtitle="vs loadboard rate"
          icon={<ShieldCheck size={20} />}
          color="cyan"
        />
        <KpiCard
          title="Lost Revenue"
          value={`$${(metrics.lost_revenue ?? 0).toLocaleString()}`}
          subtitle="from declined calls"
          icon={<AlertTriangle size={20} />}
          color="red"
        />
        <KpiCard
          title="Avg Nego Rounds"
          value={metrics.avg_negotiation_rounds.toFixed(1)}
          subtitle={`${metrics.avg_discount_pct.toFixed(1)}% avg discount`}
          icon={<TrendingUp size={20} />}
          color="blue"
          trend={prev ? trendDir(prev.discount_pct_prev, metrics.avg_discount_pct) : undefined}
          trendValue={prev ? pctChange(metrics.avg_discount_pct, prev.discount_pct_prev) : undefined}
        />
      </KpiSection>

      <KpiSection
        title="Call efficiency"
        description="How quickly calls are handled end-to-end."
      >
        <KpiCard
          title="Avg Duration"
          value={`${Math.floor(metrics.avg_call_duration_seconds / 60)}m ${Math.round(metrics.avg_call_duration_seconds % 60)}s`}
          icon={<Clock size={20} />}
          color="amber"
        />
      </KpiSection>
    </div>
  );
}
