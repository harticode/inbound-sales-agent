interface Props {
  period: string;
  onChange: (period: string) => void;
}

const options = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: 'All Time', value: 'all' },
];

export default function PeriodFilter({ period, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface-1 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            period === opt.value
              ? 'bg-primary text-on-primary'
              : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
