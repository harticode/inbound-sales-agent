import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_TOOLTIP_STYLE, OUTCOME_COLORS } from '@/lib/chart-colors';

const LABELS: Record<string, string> = {
  booked: 'Booked',
  transferred: 'Transferred',
  declined: 'Declined',
  negotiation_failed: 'Nego. Failed',
  no_loads: 'No Loads',
  carrier_not_eligible: 'Not Eligible',
  callback_requested: 'Callback',
  dropped: 'Dropped',
};

interface Props {
  data: Record<string, number>;
}

export default function OutcomeChart({ data }: Props) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: LABELS[key] || key,
    value,
    color: OUTCOME_COLORS[key] || '#9A958C',
  }));

  return (
    <div className="card">
      <h3 className="section-title mb-4">Call Outcomes</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ color: '#6B6B63', fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
