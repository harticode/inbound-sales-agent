interface CarrierEntry {
  mc_number: string;
  name: string;
  total_calls: number;
  booked: number;
  booking_rate: number;
  avg_sentiment_score: number;
}

interface Props {
  data: CarrierEntry[];
}

function sentimentColor(score: number): string {
  if (score > 2.5) return 'text-success';
  if (score >= 1.5) return 'text-warning';
  return 'text-danger';
}

function rateColor(rate: number): string {
  if (rate >= 0.7) return 'bg-success/15 text-success';
  if (rate >= 0.4) return 'bg-warning/15 text-warning';
  return 'bg-danger/15 text-danger';
}

export default function CarrierLeaderboard({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="section-title mb-4">Carrier Leaderboard</h3>
        <p className="py-8 text-center text-sm text-ink-muted">No carrier data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="section-title mb-4">Carrier Leaderboard</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="pb-3 pr-2 pl-2 font-medium text-ink-muted">#</th>
              <th className="pb-3 pr-4 font-medium text-ink-muted">Carrier</th>
              <th className="pb-3 pr-4 font-medium text-ink-muted">MC#</th>
              <th className="pb-3 text-center font-medium text-ink-muted">Calls</th>
              <th className="pb-3 text-center font-medium text-ink-muted">Booked</th>
              <th className="pb-3 text-center font-medium text-ink-muted">Rate</th>
              <th className="pb-3 pr-2 text-right font-medium text-ink-muted">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {data.map((carrier, idx) => (
              <tr key={carrier.mc_number} className="border-b border-border hover:bg-surface-1">
                <td className="py-3 pr-2 pl-2 text-ink-muted">{idx + 1}</td>
                <td className="max-w-[140px] truncate py-3 pr-4 font-medium text-ink">
                  {carrier.name || '--'}
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-ink-muted">
                  {carrier.mc_number}
                </td>
                <td className="py-3 text-center text-ink">{carrier.total_calls}</td>
                <td className="py-3 text-center text-success">{carrier.booked}</td>
                <td className="py-3 text-center">
                  <span className={`badge font-semibold ${rateColor(carrier.booking_rate ?? 0)}`}>
                    {((carrier.booking_rate ?? 0) * 100).toFixed(0)}%
                  </span>
                </td>
                <td className={`py-3 pr-2 text-right font-semibold ${sentimentColor(carrier.avg_sentiment_score ?? 0)}`}>
                  {(carrier.avg_sentiment_score ?? 0).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
