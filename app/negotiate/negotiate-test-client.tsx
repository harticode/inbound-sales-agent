'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Handshake,
  RotateCcw,
  Send,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { money } from '@/lib/utils';
import { NEGOTIATION_MAX_ROUNDS } from '@/services/negotiation';
import type { DemandNegotiationPosture, LoadRecord, NegotiationResult } from '@/types';

const MAX_ROUNDS = NEGOTIATION_MAX_ROUNDS;

type RoundEntry = {
  round: number;
  carrierOffer: number;
  result: NegotiationResult;
};

const POSTURE_LABELS: Record<DemandNegotiationPosture, string> = {
  protect_margin: 'Protect margin',
  balanced: 'Balanced',
  win_capacity: 'Win capacity',
};

const POSTURE_BADGE: Record<DemandNegotiationPosture, string> = {
  protect_margin: 'bg-danger/15 text-danger',
  balanced: 'bg-primary/15 text-primary',
  win_capacity: 'bg-success/15 text-success',
};

function formatPosture(posture?: DemandNegotiationPosture) {
  if (!posture) return '—';
  return POSTURE_LABELS[posture];
}

export default function NegotiateTestClient() {
  const [loads, setLoads] = useState<LoadRecord[]>([]);
  const [selectedLoadId, setSelectedLoadId] = useState('');
  const [carrierOffer, setCarrierOffer] = useState('');
  const [rounds, setRounds] = useState<RoundEntry[]>([]);
  const [loadingLoads, setLoadingLoads] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLoad = useMemo(
    () => loads.find((load) => load.load_id === selectedLoadId) ?? null,
    [loads, selectedLoadId],
  );

  const currentRound = rounds.length + 1;
  const latestResult = rounds.at(-1)?.result;
  const isComplete =
    rounds.length >= MAX_ROUNDS ||
    latestResult?.accepted === true ||
    latestResult?.final === true;

  const demandPosture = latestResult?.demand_posture ?? rounds[0]?.result.demand_posture;

  useEffect(() => {
    let cancelled = false;
    api
      .getLoads()
      .then((result) => {
        if (cancelled) return;
        const available = result.loads.filter((load) => load.status === 'available');
        setLoads(available);
        if (available.length > 0) {
          setSelectedLoadId(available[0].load_id);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load inventory');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLoads(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedLoad && rounds.length === 0) {
      setCarrierOffer(String(Math.round(selectedLoad.offer_rate)));
    }
  }, [selectedLoad, rounds.length]);

  function handleLoadChange(loadId: string) {
    setSelectedLoadId(loadId);
    const load = loads.find((item) => item.load_id === loadId);
    setRounds([]);
    setError(null);
    if (load) {
      setCarrierOffer(String(Math.round(load.offer_rate)));
    }
  }

  function resetSession() {
    setRounds([]);
    setError(null);
    if (selectedLoad) {
      setCarrierOffer(String(Math.round(selectedLoad.offer_rate)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLoad || isComplete) return;

    const offer = parseFloat(carrierOffer);
    if (!Number.isFinite(offer) || offer <= 0) {
      setError('Enter a valid carrier offer greater than zero.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await api.negotiate({
        load_id: selectedLoad.load_id,
        carrier_offer: offer,
        current_round: currentRound,
        previous_broker_counters: rounds
          .map((round) => round.result.counter_offer)
          .filter((counter): counter is number => counter != null),
      });

      setRounds((prev) => [...prev, { round: currentRound, carrierOffer: offer, result }]);

      if (!result.final && !result.accepted && result.counter_offer != null) {
        setCarrierOffer(String(Math.round(result.counter_offer + 50)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Negotiation request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[960px] px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="mb-3 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10">
              <Handshake className="text-primary" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-medium text-ink">Negotiation tester</h1>
              <p className="text-sm text-ink-muted">
                Simulate up to {MAX_ROUNDS} rounds against the live negotiation engine.
              </p>
            </div>
          </div>
        </div>
        <button type="button" onClick={resetSession} className="btn-ghost" disabled={rounds.length === 0}>
          <RotateCcw size={16} />
          Reset session
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card space-y-6">
          <div>
            <p className="section-title mb-2">Load</p>
            {loadingLoads ? (
              <p className="text-sm text-ink-muted">Loading loads…</p>
            ) : loads.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No available loads found.{' '}
                <Link href="/loads" className="text-primary hover:underline">
                  Add inventory
                </Link>
              </p>
            ) : (
              <select
                className="input"
                value={selectedLoadId}
                onChange={(e) => handleLoadChange(e.target.value)}
                disabled={rounds.length > 0}
              >
                {loads.map((load) => (
                  <option key={load.load_id} value={load.load_id}>
                    {load.load_id} — {load.origin} → {load.destination} (${money(load.loadboard_rate)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedLoad && (
            <div className="grid gap-3 rounded-md border border-border bg-canvas p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-muted">Lane</p>
                <p className="text-sm font-medium">
                  {selectedLoad.origin} → {selectedLoad.destination}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Loadboard rate</p>
                <p className="text-sm font-medium">${money(selectedLoad.loadboard_rate)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Opening offer (85%)</p>
                <p className="text-sm font-medium">${money(selectedLoad.offer_rate)}</p>
              </div>
            </div>
          )}

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="section-title">Round {Math.min(currentRound, MAX_ROUNDS)} of {MAX_ROUNDS}</p>
              <div className="flex gap-2">
                {Array.from({ length: MAX_ROUNDS }, (_, index) => {
                  const roundNumber = index + 1;
                  const completed = rounds.some((entry) => entry.round === roundNumber);
                  const active = currentRound === roundNumber && !isComplete;
                  return (
                    <span
                      key={roundNumber}
                      className={`badge ${
                        completed
                          ? 'bg-success/15 text-success'
                          : active
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-2 text-ink-muted'
                      }`}
                    >
                      R{roundNumber}
                    </span>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="carrier-offer" className="mb-1.5 block text-sm text-ink-muted">
                  Carrier counter-offer ($)
                </label>
                <input
                  id="carrier-offer"
                  type="number"
                  min="1"
                  step="1"
                  className="input"
                  value={carrierOffer}
                  onChange={(e) => setCarrierOffer(e.target.value)}
                  disabled={!selectedLoad || isComplete || submitting}
                  placeholder="e.g. 2650"
                />
              </div>

              {error && (
                <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}

              {isComplete && latestResult && (
                <div
                  className={`rounded-md border px-4 py-3 ${
                    latestResult.accepted
                      ? 'border-success/30 bg-success/10 text-success'
                      : 'border-warning/30 bg-warning/10 text-warning'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {latestResult.accepted ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    {latestResult.accepted ? 'Deal accepted' : 'Negotiation ended'}
                  </div>
                  <p className="mt-1 text-sm">{latestResult.message}</p>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={!selectedLoad || isComplete || submitting}
              >
                <Send size={16} />
                {submitting ? 'Evaluating…' : `Submit round ${currentRound}`}
              </button>
            </form>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card space-y-3">
            <p className="section-title">Demand posture</p>
            {demandPosture ? (
              <>
                <span className={`badge ${POSTURE_BADGE[demandPosture]}`}>
                  {formatPosture(demandPosture)}
                </span>
                {latestResult?.demand_reason && (
                  <p className="text-sm text-ink-muted">{latestResult.demand_reason}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                Posture appears after the first round is submitted.
              </p>
            )}
          </div>

          <div className="card space-y-4">
            <p className="section-title">Round history</p>
            {rounds.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Submit a carrier offer to see broker responses here.
              </p>
            ) : (
              <ol className="space-y-4">
                {rounds.map((entry) => (
                  <li
                    key={entry.round}
                    className="rounded-md border border-border bg-canvas p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Round {entry.round}</span>
                      <span
                        className={`badge ${
                          entry.result.accepted
                            ? 'bg-success/15 text-success'
                            : entry.result.final
                              ? 'bg-warning/15 text-warning'
                              : 'bg-primary/15 text-primary'
                        }`}
                      >
                        {entry.result.accepted
                          ? 'Accepted'
                          : entry.result.final
                            ? 'Final'
                            : 'Counter'}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Carrier asked ${money(entry.carrierOffer)}
                      {entry.result.counter_offer != null &&
                        ` · Broker counter $${money(entry.result.counter_offer)}`}
                    </p>
                    <div className="mt-3 flex gap-2 text-ink-muted">
                      <MessageSquare size={14} className="mt-0.5 shrink-0" />
                      <p className="text-sm text-ink">{entry.result.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
