export function fmtCurrency(val: number | null | undefined) {
  if (val == null) return '—';
  return `$${val.toLocaleString()}`;
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function fmtWeight(lbs: number | null | undefined) {
  if (lbs == null) return '—';
  return `${lbs.toLocaleString()} lbs`;
}
