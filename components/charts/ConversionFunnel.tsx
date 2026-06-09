import { FUNNEL_COLORS } from '@/lib/chart-colors';

interface FunnelStep {
  stage: string;
  count: number;
}

interface Props {
  data: FunnelStep[];
}

export default function ConversionFunnel({ data }: Props) {
  const max = data[0]?.count || 1;

  return (
    <div className="card">
      <h3 className="section-title mb-6">Conversion Funnel</h3>
      <div className="flex flex-col items-center gap-1">
        {data.map((step, i) => {
          const widthPct = Math.max((step.count / max) * 100, 20);
          const convPct = i > 0 && data[i - 1].count > 0
            ? ((step.count / data[i - 1].count) * 100).toFixed(0)
            : null;

          return (
            <div key={step.stage} className="flex w-full flex-col items-center">
              {convPct && (
                <span className="mb-1 text-[11px] font-medium text-ink-muted">
                  {convPct}% &darr;
                </span>
              )}
              <div
                className="relative flex min-w-[180px] items-center justify-between rounded-md px-4 py-3 transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: `${FUNNEL_COLORS[i % FUNNEL_COLORS.length]}20`,
                  borderLeft: `3px solid ${FUNNEL_COLORS[i % FUNNEL_COLORS.length]}`,
                }}
              >
                <span className="text-sm font-medium text-ink">
                  {step.stage}
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ color: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                >
                  {step.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
