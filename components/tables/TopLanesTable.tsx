interface Lane {
  lane: string;
  count: number;
  booked: number;
}

interface Props {
  data: Lane[];
}

export default function TopLanesTable({ data }: Props) {
  return (
    <div className="card">
      <h3 className="section-title mb-4">Top Lanes</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="pb-3 pl-2 font-medium text-ink-muted">Lane</th>
              <th className="pb-3 text-center font-medium text-ink-muted">Calls</th>
              <th className="pb-3 text-center font-medium text-ink-muted">Booked</th>
              <th className="pb-3 pr-2 text-right font-medium text-ink-muted">Conv. Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((lane) => {
              const rate = lane.count > 0 ? (lane.booked / lane.count) * 100 : 0;
              return (
                <tr key={lane.lane} className="border-b border-border hover:bg-surface-1">
                  <td className="py-3 pl-2 font-medium text-ink">{lane.lane}</td>
                  <td className="py-3 text-center text-ink">{lane.count}</td>
                  <td className="py-3 text-center text-success">{lane.booked}</td>
                  <td className="py-3 pr-2 text-right">
                    <span
                      className={`badge font-semibold ${
                        rate >= 70
                          ? 'bg-success/15 text-success'
                          : rate >= 40
                            ? 'bg-warning/15 text-warning'
                            : 'bg-danger/15 text-danger'
                      }`}
                    >
                      {rate.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
