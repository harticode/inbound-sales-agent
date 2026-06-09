import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { CHART_AXIS_TICK, CHART_COLORS, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/lib/chart-colors';

interface RateEntry {
  call_id: string;
  loadboard_rate: number;
  agreed_rate: number;
  discount_pct: number;
}

interface Props {
  data: RateEntry[];
}

export default function RateComparisonChart({ data }: Props) {
  return (
    <div className="card">
      <h3 className="section-title mb-4">Loadboard Rate vs Agreed Rate</h3>
      <ResponsiveContainer width="100%" height={Math.min(420, Math.max(280, data.length * 36))}>
        <BarChart data={data} barGap={2} margin={{ bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis
            dataKey="call_id"
            tick={{ ...CHART_AXIS_TICK, fontSize: 11 }}
            interval={0}
            angle={data.length > 8 ? -35 : 0}
            textAnchor={data.length > 8 ? 'end' : 'middle'}
            height={data.length > 8 ? 56 : 30}
          />
          <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value) => `$${Number(value).toLocaleString()}`}
          />
          <Legend wrapperStyle={{ color: '#6B6B63', fontSize: '12px' }} />
          <Bar
            dataKey="loadboard_rate"
            name="Loadboard Rate"
            fill={CHART_COLORS.muted}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="agreed_rate"
            name="Agreed Rate"
            fill={CHART_COLORS.success}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
