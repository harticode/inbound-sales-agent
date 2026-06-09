'use client';

import dynamic from 'next/dynamic';
import { XCircle, RefreshCw } from 'lucide-react';
import { useActiveCalls } from '@/hooks/use-active-calls';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import AgentImpact from '@/components/dashboard/AgentImpact';
import NegotiationBreakdown from '@/components/dashboard/NegotiationBreakdown';
import OutcomeChart from '@/components/charts/OutcomeChart';
import SentimentChart from '@/components/charts/SentimentChart';
import CallVolumeChart from '@/components/charts/CallVolumeChart';
import TopLanesTable from '@/components/tables/TopLanesTable';
import RateComparisonChart from '@/components/charts/RateComparisonChart';
import CallsTable from '@/components/tables/CallsTable';
import ConversionFunnel from '@/components/charts/ConversionFunnel';
import EquipmentChart from '@/components/charts/EquipmentChart';
import PeriodFilter from '@/components/ui/PeriodFilter';
import LiveCallBanner from '@/components/dashboard/LiveCallBanner';
import WebCallPanel from '@/components/voice/WebCallPanel';
import PeakHoursHeatmap from '@/components/charts/PeakHoursHeatmap';
import CarrierLeaderboard from '@/components/tables/CarrierLeaderboard';
import LaneDemandChart from '@/components/charts/LaneDemandChart';
import DemandKpiPanel from '@/components/dashboard/DemandKpiPanel';
import KpiGrid from '@/components/dashboard/KpiGrid';
import DashboardSection from '@/components/dashboard/DashboardSection';
import LoadsSummary from '@/components/tables/LoadsSummary';

const LaneRouteMap = dynamic(() => import('@/components/maps/LaneRouteMap'), { ssr: false });

export default function DashboardPage() {
  const activeCalls = useActiveCalls();
  const { metrics, calls, loading, error, lastRefresh, period, setPeriod, refresh } = useDashboardData();

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="card border-danger/30 bg-danger/5 p-8 text-center">
          <XCircle className="mx-auto mb-4 text-danger" size={48} />
          <h2 className="text-xl font-medium text-danger">Connection Error</h2>
          <p className="mt-2 text-sm text-ink-muted">{error}</p>
          <button
            onClick={refresh}
            className="btn-ghost mt-4 border-danger/30 text-danger hover:bg-danger/5"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-16 lg:py-24">
      <div className="mb-6 flex items-center justify-end gap-4">
        <span className="text-xs text-ink-muted">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-ghost"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && !metrics ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw size={32} className="animate-spin text-primary" />
        </div>
      ) : metrics ? (
        <div className="space-y-16">
          {/* 1. Live operations */}
          <div className="space-y-6">
            <WebCallPanel />
            <LiveCallBanner />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <PeriodFilter period={period} onChange={setPeriod} />
            </div>
          </div>

          {/* 2. Overview KPIs */}
          <DashboardSection title="Overview">
            <KpiGrid metrics={metrics} />
          </DashboardSection>

          {/* 3. Conversion & outcomes */}
          <DashboardSection title="Conversion & outcomes">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
              <ConversionFunnel data={metrics.conversion_funnel} />
              <OutcomeChart data={metrics.outcome_distribution} />
            </div>
          </DashboardSection>

          {/* 4. Pricing & negotiation — stacked: breakdown is tall, rate chart reads better full-width */}
          <DashboardSection title="Pricing & negotiation">
            <div className="space-y-8">
              <NegotiationBreakdown
                data={metrics.negotiation_breakdown}
                demandData={metrics.demand_negotiation_breakdown}
              />
              <RateComparisonChart data={metrics.rate_comparison} />
            </div>
          </DashboardSection>

          {/* 5. Automation ROI */}
          <DashboardSection title="Automation ROI">
            <div className="space-y-8">
              {metrics.agent_impact && (
                <AgentImpact impact={metrics.agent_impact} totalCalls={metrics.total_calls} />
              )}
              <SentimentChart data={metrics.sentiment_distribution} />
            </div>
          </DashboardSection>

          {/* 6. Market & demand */}
          <DashboardSection title="Market & demand">
            <div className="space-y-8">
              <DemandKpiPanel
                kpis={metrics.demand_kpis}
                profiles={metrics.demand_profiles ?? []}
              />
              <LaneDemandChart data={metrics.lane_demand_vs_inventory || []} />
              <LaneRouteMap data={metrics.lane_routes ?? []} />
              <LoadsSummary />
              <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
                <TopLanesTable data={metrics.top_lanes} />
                <EquipmentChart data={metrics.equipment_distribution} />
              </div>
            </div>
          </DashboardSection>

          {/* 7. Carrier relationships */}
          <DashboardSection title="Carrier relationships">
            <CarrierLeaderboard data={metrics.carrier_leaderboard || []} />
          </DashboardSection>

          {/* 8. Activity patterns */}
          <DashboardSection title="Activity patterns">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
              <PeakHoursHeatmap data={metrics.peak_hours || []} />
              <CallVolumeChart data={metrics.calls_by_day} />
            </div>
          </DashboardSection>

          {/* 9. Call history */}
          <DashboardSection title="Call history">
            <CallsTable calls={calls} activeCalls={activeCalls} />
          </DashboardSection>
        </div>
      ) : null}
    </main>
  );
}
