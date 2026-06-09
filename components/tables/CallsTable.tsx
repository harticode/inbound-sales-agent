'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Clock, Phone, TrendingUp, User, Filter, Download, ExternalLink } from 'lucide-react';
import type { CallRecord, CallEvent } from '@/types';
import { api } from '@/lib/api-client';
import { DEFAULT_BADGE, outcomeBadge, sentimentBadge } from '@/lib/chart-colors';

interface ActiveCall {
  call_id: string;
  started_at: string;
  last_event: CallEvent;
  event_count: number;
}

interface Props {
  calls: CallRecord[];
  activeCalls?: ActiveCall[];
}

const OUTCOMES = ['all', 'booked', 'transferred', 'declined', 'negotiation_failed', 'no_loads', 'carrier_not_eligible', 'dropped'];
const SENTIMENTS = ['all', 'positive', 'neutral', 'negative', 'frustrated'];

function fmtDuration(seconds: number | null) {
  if (seconds == null) return '—';
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function fmtCurrency(val: number | null) {
  if (val == null) return '—';
  return `$${val.toLocaleString()}`;
}

function CallDetailRow({ call }: { call: CallRecord }) {
  return (
    <tr className="bg-surface-2/50">
      <td colSpan={13} className="px-6 py-4">
        <div className="space-y-4">
          {call.transcript_summary && (
            <div>
              <p className="section-title mb-1">Summary</p>
              <p className="text-sm leading-relaxed text-ink">{call.transcript_summary}</p>
            </div>
          )}
          {call.counter_offers.length > 0 && (
            <div>
              <p className="section-title mb-1">Negotiation Rounds</p>
              <div className="space-y-1">
                {call.counter_offers.map((co, i) => (
                  <div key={i} className="flex gap-4 text-sm text-ink-muted">
                    <span className="font-mono text-ink-muted">R{co.round}</span>
                    <span>Carrier: <span className="text-warning">{fmtCurrency(co.carrier)}</span></span>
                    {co.broker && <span>Broker: <span className="text-primary">{fmtCurrency(co.broker)}</span></span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {call.notes && (
            <div>
              <p className="section-title mb-1">Notes</p>
              <p className="text-sm text-ink">{call.notes}</p>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

const EVENT_LABELS: Record<string, string> = {
  carrier_verify: 'Verifying carrier',
  load_search: 'Searching loads',
  negotiate: 'Negotiating',
  call_logged: 'Completed',
};

export default function CallsTable({ calls, activeCalls = [] }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [sentimentFilter, setSentimentFilter] = useState('all');

  const filtered = calls.filter((c) => {
    if (outcomeFilter !== 'all' && c.outcome !== outcomeFilter) return false;
    if (sentimentFilter !== 'all' && c.sentiment !== sentimentFilter) return false;
    return true;
  });

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="section-title flex items-center gap-2">
          <Phone size={16} />
          Call History
          <span className="badge ml-1 bg-surface-2 font-normal text-ink-muted">
            {filtered.length}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-ink-muted" />
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="input w-auto py-1 text-xs"
          >
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{o === 'all' ? 'All Outcomes' : o.replaceAll('_', ' ')}</option>
            ))}
          </select>
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="input w-auto py-1 text-xs"
          >
            {SENTIMENTS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Sentiments' : s}</option>
            ))}
          </select>
          <button
            onClick={() => window.open(api.exportCsvUrl, '_blank')}
            className="btn-ghost min-h-0 px-3 py-1.5 text-xs"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="w-8 pb-3" />
              {['Call ID', 'Date', 'Carrier', 'Lane', 'Equipment', 'Rate', 'Agreed', 'Rounds', 'Duration', 'Outcome', 'Sentiment', ''].map(
                (h, i) => (
                  <th key={`${h}-${i}`} className="whitespace-nowrap pb-3 pr-4 font-medium text-ink-muted">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {activeCalls.map((ac) => (
              <tr
                key={ac.call_id}
                className="cursor-pointer border-b border-primary/20 bg-primary/5 transition-colors hover:bg-primary/10"
                onClick={() => router.push(`/calls/${ac.call_id}`)}
              >
                <td className="py-3 pl-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-primary">{ac.call_id}</td>
                <td className="whitespace-nowrap py-3 pr-4 text-xs text-ink-muted">
                  {new Date(ac.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-3 pr-4 text-ink-muted" colSpan={5}>
                  <span className="font-medium text-ink">
                    {EVENT_LABELS[ac.last_event?.event_type] ?? 'In progress'}
                  </span>
                  <span className="ml-2 text-ink-muted">({ac.event_count} events)</span>
                </td>
                <td className="py-3 pr-4" colSpan={2}>
                  <span className="badge inline-flex items-center gap-1.5 bg-success/15 font-semibold text-success">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                    </span>
                    LIVE
                  </span>
                </td>
                <td className="py-3 pr-2">
                  <button
                    className="btn-ghost min-h-0 border-primary/30 px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
                  >
                    <ExternalLink size={12} />
                    Live View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.map((c) => {
              const isOpen = expanded.has(c.call_id);
              const hasDetail = c.transcript_summary || c.counter_offers.length > 0;
              return (
                <Fragment key={c.call_id}>
                  <tr
                    className={`border-b border-border ${hasDetail ? 'cursor-pointer hover:bg-surface-1' : ''}`}
                    onClick={() => hasDetail && toggle(c.call_id)}
                  >
                    <td className="py-3 pl-1">
                      {hasDetail && (
                        isOpen
                          ? <ChevronDown size={14} className="text-ink-muted" />
                          : <ChevronRight size={14} className="text-ink-muted" />
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-ink-muted">
                      {c.call_id}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-xs text-ink-muted">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-ink-muted" />
                        <div>
                          <div className="font-medium text-ink">{c.carrier_name || '—'}</div>
                          <div className="text-xs text-ink-muted">MC {c.carrier_mc_number || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-ink">
                      {c.origin_requested && c.destination_requested
                        ? `${c.origin_requested} → ${c.destination_requested}`
                        : '—'}
                    </td>
                    <td className="py-3 pr-4 text-ink">{c.equipment_requested || '—'}</td>
                    <td className="py-3 pr-4 text-ink">{fmtCurrency(c.loadboard_rate)}</td>
                    <td className="py-3 pr-4 font-semibold text-success">
                      {fmtCurrency(c.final_agreed_rate)}
                    </td>
                    <td className="py-3 pr-4 text-center text-ink">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-ink-muted" />
                        {c.negotiation_rounds}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-ink">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-ink-muted" />
                        {fmtDuration(c.call_duration_seconds)}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`badge font-semibold ${outcomeBadge[c.outcome] ?? DEFAULT_BADGE}`}>
                        {c.outcome.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`badge font-semibold ${sentimentBadge[c.sentiment] ?? DEFAULT_BADGE}`}>
                        {c.sentiment}
                      </span>
                    </td>
                    <td className="py-3 pr-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/calls/${c.call_id}`); }}
                        className="btn-ghost min-h-0 border-primary/30 px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
                      >
                        <ExternalLink size={12} />
                        Details
                      </button>
                    </td>
                  </tr>
                  {isOpen && <CallDetailRow call={c} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
