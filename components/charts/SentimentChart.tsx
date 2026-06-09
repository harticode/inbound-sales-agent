import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE, SENTIMENT_COLORS } from '@/lib/chart-colors';

interface Props {
  data: Record<string, number>;
}

export default function SentimentChart({ data }: Props) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    fill: SENTIMENT_COLORS[key] || '#9A958C',
  }));

  return (
    <div className="card">
      <h3 className="section-title mb-4">Carrier Sentiment</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barSize={40}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
          <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
