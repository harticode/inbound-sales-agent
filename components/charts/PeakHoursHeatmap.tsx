interface PeakHour {
  day: number;
  hour: number;
  count: number;
}

interface Props {
  data: PeakHour[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => i);
const SHOW_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

export default function PeakHoursHeatmap({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="section-title mb-4">Peak Hours</h3>
        <p className="py-8 text-center text-sm text-ink-muted">No peak hour data available</p>
      </div>
    );
  }

  const countMap = new Map<string, number>();
  let maxCount = 0;
  for (const item of data) {
    const key = `${item.day}-${item.hour}`;
    countMap.set(key, item.count);
    if (item.count > maxCount) maxCount = item.count;
  }

  return (
    <div className="card">
      <h3 className="section-title mb-4">Peak Hours</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {DAY_LABELS.map((dayLabel, dayIdx) => (
            <div key={dayLabel} className="mb-1 flex items-center gap-1">
              <span className="w-10 shrink-0 pr-2 text-right text-xs text-ink-muted">
                {dayLabel}
              </span>
              {HOUR_LABELS.map((hour) => {
                const count = countMap.get(`${dayIdx}-${hour}`) ?? 0;
                const opacity = maxCount > 0 ? Math.max(0.08, count / maxCount) : 0.08;
                return (
                  <div
                    key={hour}
                    className="h-6 flex-1 rounded-sm"
                    style={{
                      backgroundColor: `rgba(194, 82, 45, ${opacity})`,
                    }}
                    title={`${dayLabel} ${hour}:00 - ${count} call${count !== 1 ? 's' : ''}`}
                  />
                );
              })}
            </div>
          ))}
          <div className="mt-1 flex items-center gap-1">
            <span className="w-10 shrink-0" />
            {HOUR_LABELS.map((hour) => (
              <div key={hour} className="flex-1 text-center">
                {SHOW_HOURS.includes(hour) ? (
                  <span className="text-[10px] text-ink-muted">{hour}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
