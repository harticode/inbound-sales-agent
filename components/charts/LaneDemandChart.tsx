import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { CHART_AXIS_TICK, CHART_COLORS, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/lib/chart-colors';

interface LaneEntry {
  lane: string;
  call_count: number;
  available_loads: number;
}

interface Props {
  data: LaneEntry[];
}

export default function LaneDemandChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="section-title mb-4">Lane Demand vs Inventory</h3>
        <p className="py-8 text-center text-sm text-ink-muted">No lane demand data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="section-title mb-1">Lane Demand vs Inventory</h3>
      <p className="mb-4 text-xs text-ink-muted">
        Lanes where demand exceeds inventory are highlighted
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis
            dataKey="lane"
            tick={{ ...CHART_AXIS_TICK, fontSize: 11 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={CHART_AXIS_TICK} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ color: '#6B6B63', fontSize: '12px' }} />
          <Bar dataKey="call_count" name="Demand (Calls)" radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.call_count > entry.available_loads ? CHART_COLORS.warning : CHART_COLORS.primary}
              />
            ))}
          </Bar>
          <Bar
            dataKey="available_loads"
            name="Available Loads"
            fill={CHART_COLORS.success}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
