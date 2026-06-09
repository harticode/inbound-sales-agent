'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { LoadRecord, LoadSearchParams } from '@/types';
import LoadsTable from '@/components/tables/LoadsTable';

const EQUIPMENT_TYPES = [
  '',
  'Dry Van',
  'Reefer',
  'Flatbed',
  'Box Truck',
  'Step Deck',
];

const EMPTY_FILTERS = {
  origin: '',
  destination: '',
  equipment_type: '',
  min_rate: '',
  max_weight: '',
  pickup_date: '',
};

export default function LoadsClient() {
  const [loads, setLoads] = useState<LoadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState<LoadSearchParams>({});

  async function fetchLoads(params: LoadSearchParams = applied) {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getLoads(params);
      setLoads(result.loads);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLoads();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params: LoadSearchParams = {};
    if (filters.origin.trim()) params.origin = filters.origin.trim();
    if (filters.destination.trim()) params.destination = filters.destination.trim();
    if (filters.equipment_type) params.equipment_type = filters.equipment_type;
    if (filters.min_rate) params.min_rate = parseFloat(filters.min_rate);
    if (filters.max_weight) params.max_weight = parseFloat(filters.max_weight);
    if (filters.pickup_date) params.pickup_date = filters.pickup_date;
    setApplied(params);
    fetchLoads(params);
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS);
    setApplied({});
    fetchLoads({});
  }

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-16 lg:py-24">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-ink">Available Loads</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Browse freight inventory — {loading ? '...' : `${total} load${total === 1 ? '' : 's'}`}
        </p>
      </div>

      <form onSubmit={handleSearch} className="card mb-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Origin</label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Chicago"
              value={filters.origin}
              onChange={(e) => setFilters((f) => ({ ...f, origin: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Destination</label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Dallas"
              value={filters.destination}
              onChange={(e) => setFilters((f) => ({ ...f, destination: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Equipment</label>
            <select
              className="input w-full"
              value={filters.equipment_type}
              onChange={(e) => setFilters((f) => ({ ...f, equipment_type: e.target.value }))}
            >
              <option value="">All equipment</option>
              {EQUIPMENT_TYPES.filter(Boolean).map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Min rate ($)</label>
            <input
              type="number"
              className="input w-full"
              placeholder="e.g. 1000"
              min="0"
              value={filters.min_rate}
              onChange={(e) => setFilters((f) => ({ ...f, min_rate: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Max weight (lbs)</label>
            <input
              type="number"
              className="input w-full"
              placeholder="e.g. 45000"
              min="0"
              value={filters.max_weight}
              onChange={(e) => setFilters((f) => ({ ...f, max_weight: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Pickup date</label>
            <input
              type="date"
              className="input w-full"
              value={filters.pickup_date}
              onChange={(e) => setFilters((f) => ({ ...f, pickup_date: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            Search
          </button>
          <button type="button" onClick={handleClear} className="btn-ghost" disabled={loading}>
            Clear
          </button>
        </div>
      </form>

      {error ? (
        <div className="card border-danger/30 bg-danger/5 p-8 text-center">
          <p className="text-sm text-danger">{error}</p>
          <button onClick={() => fetchLoads()} className="btn-ghost mt-4 text-danger">
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="card flex h-48 items-center justify-center">
          <RefreshCw size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <LoadsTable loads={loads} />
      )}
    </main>
  );
}
