'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Shield, Search, DollarSign, CheckCircle, Phone,
  Clock, User, Truck, FileText, RefreshCw, MessageCircle, List,
  Mic, MicOff, PhoneOff, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { CallDetail, CallEvent } from '@/types';
import ChatView from '@/components/voice/ChatView';
import { useVoiceCall } from '@/hooks/use-voice-call';
import { DEFAULT_BADGE, outcomeBadge, sentimentBadge } from '@/lib/chart-colors';

const eventIconMap: Record<string, typeof Shield> = {
  carrier_verify: Shield,
  load_search: Search,
  negotiate: DollarSign,
  call_logged: CheckCircle,
  call_started: Phone,
};

const eventLabelMap: Record<string, string> = {
  call_started: 'Call Started',
  carrier_verify: 'Carrier Verification',
  load_search: 'Load Search',
  negotiate: 'Negotiation',
  call_logged: 'Call Logged',
};

function fmtDuration(seconds: number | null) {
  if (seconds == null) return '--';
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function fmtCurrency(val: number | null) {
  if (val == null) return '--';
  return `$${val.toLocaleString()}`;
}

function describeEvent(event: CallEvent): string {
  const p = event.payload;
  switch (event.event_type) {
    case 'call_started':
      return `Inbound call received${p?.caller_name ? ` from ${p.caller_name}` : ''}`;
    case 'carrier_verify': {
      const name = p?.legal_name ? ` — ${p.legal_name}` : '';
      if (p?.is_eligible === true) return `Carrier MC#${p.mc_number ?? '?'} verified${name}. Authorized to operate.`;
      if (p?.is_eligible === false) return `Carrier MC#${p.mc_number ?? '?'}${name}: ${p?.reason ?? 'not eligible'}`;
      return `Verifying carrier MC#${p?.mc_number ?? '?'}...`;
    }
    case 'load_search': {
      const lane = [p?.origin, p?.destination].filter(Boolean).join(' → ');
      if (p?.results_count != null) return `Found ${p.results_count} matching load(s)${lane ? ` on ${lane}` : ''}${p?.equipment ? ` (${p.equipment})` : ''}`;
      return `Searching for loads${lane ? ` on ${lane}` : ''}`;
    }
    case 'negotiate': {
      const accepted = p?.accepted;
      const offer = p?.carrier_offer ? fmtCurrency(Number(p.carrier_offer)) : null;
      const counter = p?.counter_offer ? fmtCurrency(Number(p.counter_offer)) : null;
      if (accepted === true) return `Round ${p?.round ?? '?'}: Carrier offered ${offer} — Accepted!`;
      if (counter) return `Round ${p?.round ?? '?'}: Carrier offered ${offer}, broker countered at ${counter}`;
      if (offer) return `Round ${p?.round ?? '?'}: Carrier offered ${offer}${p?.message ? ` — ${p.message}` : ''}`;
      return `Negotiation round ${p?.round ?? '?'}`;
    }
    case 'call_logged':
      return `Call completed — outcome: ${p?.outcome ?? 'unknown'}`;
    default:
      return JSON.stringify(p);
  }
}

export default function CallDetailPage({ callId }: { callId: string }) {
  const router = useRouter();
  const { status: voiceStatus, muted, callId: activeVoiceCallId, isActive: voiceActive, endCall, toggleMute } = useVoiceCall();
  const isVoiceSession = voiceActive && voiceStatus !== 'idle';
  const isVoiceSessionForPage = isVoiceSession && activeVoiceCallId === callId;
  const [call, setCall] = useState<CallDetail | null>(null);
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'timeline'>('chat');
  const [transcriptMessages, setTranscriptMessages] = useState<{ role: string; content: string; timestamp: string }[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const transcriptRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!callId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detail = await api.getCallDetail(callId!);
        if (!cancelled) {
          setCall(detail);
          setEvents(detail.events ?? []);

          // Load persisted real transcript (attached by backend when call ended)
          const persisted = (detail.extracted_data as any)?.transcript;
          if (Array.isArray(persisted) && persisted.length > 0) {
            setTranscriptMessages(persisted);
          }

          // If the call is still active, connect SSE
          const stillActive =
            isVoiceSessionForPage ||
            !detail.ended_at ||
            !detail.outcome ||
            detail.outcome === 'in_progress';
          setIsLive(stillActive);

          if (stillActive) {
            const es = new EventSource(`/api/events/calls/${encodeURIComponent(callId)}/stream`);
            eventSourceRef.current = es;

            es.onmessage = (e) => {
              try {
                const event: CallEvent = JSON.parse(e.data);
                // Deduplicate by event id
                setEvents((prev) => {
                  if (prev.some((existing) => existing.id === event.id)) return prev;
                  return [...prev, event];
                });

                // If the event signals call completion, re-fetch full call data and close SSE
                if (event.event_type === 'call_logged') {
                  setIsLive(false);
                  es.close();
                  transcriptRef.current?.close();
                  api.getCallDetail(callId!).then((updated) => {
                    setCall(updated);
                    setEvents(updated.events ?? []);
                    const persisted = (updated.extracted_data as any)?.transcript;
                    if (Array.isArray(persisted) && persisted.length > 0) {
                      setTranscriptMessages(persisted);
                    }
                  }).catch(() => {});
                }
              } catch {
                // ignore malformed events
              }
            };

            // Don't handle onerror aggressively — EventSource auto-reconnects on transient errors.
            // The stream will close naturally when we receive `call_logged`.
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load call');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      transcriptRef.current?.close();
    };
  }, [callId, isVoiceSessionForPage]);

  useEffect(() => {
    if (isVoiceSessionForPage) setIsLive(true);
  }, [isVoiceSessionForPage]);

  // Connect to real HappyRobot transcript stream when live
  useEffect(() => {
    if (!isLive || !callId) return;

    let cancelled = false;

    async function connectTranscript() {
      for (let attempt = 0; attempt < 30; attempt++) {
        if (cancelled) return;
        try {
          const { session_id } = await api.getTranscriptSession(callId);
          if (session_id) {
            const es = new EventSource(api.transcriptStreamUrl(session_id));
            transcriptRef.current = es;

            es.onmessage = (e) => {
              try {
                const msg = JSON.parse(e.data);

                if (msg.session_status === 'completed' || msg.status === 'completed') {
                  setIsLive(false);
                  es.close();
                  api.getCallDetail(callId).then((updated) => {
                    setCall(updated);
                    setEvents(updated.events ?? []);
                    const persisted = (updated.extracted_data as { transcript?: typeof transcriptMessages })?.transcript;
                    if (Array.isArray(persisted) && persisted.length > 0) {
                      setTranscriptMessages(persisted);
                    }
                  }).catch(() => {});
                  return;
                }

                if (msg.error) return;
                if (msg.count != null) return;
                const role = msg.role ?? msg.type ?? '';
                if (role !== 'user' && role !== 'assistant') return;
                const content = msg.content ?? msg.text ?? msg.message ?? '';
                if (!content || typeof content !== 'string') return;
                if (content.startsWith('{') || content.startsWith('[')) return;

                setTranscriptMessages((prev) => {
                  const messageId = msg.id as string | undefined;
                  if (messageId && prev.some((m) => (m as { id?: string }).id === messageId)) {
                    return prev;
                  }
                  const key = `${role}-${content}`;
                  if (prev.some((m) => `${m.role}-${m.content}` === key)) return prev;
                  return [...prev, {
                    role,
                    content,
                    timestamp: msg.timestamp ?? msg.created_at ?? new Date().toISOString(),
                  }];
                });
              } catch { /* ignore */ }
            };

            return;
          }
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    connectTranscript();

    return () => {
      cancelled = true;
      transcriptRef.current?.close();
    };
  }, [isLive, callId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-16 lg:py-24">
        <div className="flex h-64 items-center justify-center">
          <RefreshCw size={32} className="animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (error || !call) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-16 lg:py-24">
        <button
          onClick={() => router.push('/')}
          className="mb-6 flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="card border-danger/30 bg-danger/5 p-8 text-center">
          <h2 className="text-xl font-medium text-danger">Failed to load call</h2>
          <p className="mt-2 text-sm text-danger">{error ?? 'Call not found'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1200px] space-y-6 px-6 py-16 lg:py-24">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
              <Phone className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="font-mono text-lg font-medium text-ink">{call.call_id}</h2>
              {call.started_at && (
                <p className="text-xs text-ink-muted">
                  {new Date(call.started_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            {isVoiceSession && (
              <>
                {voiceStatus === 'connected' && (
                  <button
                    type="button"
                    onClick={() => void toggleMute()}
                    className="btn-ghost"
                  >
                    {muted ? <MicOff size={16} /> : <Mic size={16} />}
                    {muted ? 'Unmute' : 'Mute'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void endCall()}
                  disabled={voiceStatus === 'ending'}
                  className="btn-danger disabled:opacity-50"
                >
                  {voiceStatus === 'ending' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <PhoneOff size={16} />
                  )}
                  End Call
                </button>
              </>
            )}
            {isLive && (
              <span className="badge flex items-center gap-2 bg-success/15 font-semibold text-success">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
                LIVE
              </span>
            )}
            <span className={`badge font-semibold ${outcomeBadge[call.outcome] ?? DEFAULT_BADGE}`}>
              {call.outcome?.replaceAll('_', ' ') ?? 'in progress'}
            </span>
            <span className={`badge font-semibold ${sentimentBadge[call.sentiment] ?? DEFAULT_BADGE}`}>
              {call.sentiment ?? '--'}
            </span>
            <span className="flex items-center gap-1 text-sm text-ink-muted">
              <Clock size={14} />
              {fmtDuration(call.call_duration_seconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Timeline (left 2/3) + Info (right 1/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Tabs (Chat / Timeline) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex w-fit items-center gap-1 rounded-md border border-border bg-surface-1 p-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'chat' ? 'bg-primary text-on-primary' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <MessageCircle size={15} />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'timeline' ? 'bg-primary text-on-primary' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <List size={15} />
              Timeline
            </button>
          </div>

          {/* Chat View */}
          {activeTab === 'chat' && (
            <ChatView events={events} isLive={isLive} transcriptMessages={transcriptMessages} />
          )}

          {/* Timeline View */}
          {activeTab === 'timeline' && (
            events.length === 0 ? (
              <div className="card p-6 text-center text-sm text-ink-muted">
                No events recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event, idx) => {
                  const Icon = eventIconMap[event.event_type] ?? FileText;
                  const isLatest = idx === events.length - 1;
                  return (
                    <div
                      key={event.id ?? idx}
                      className={`card relative flex gap-4 p-4 ${
                        isLatest && isLive ? 'ring-1 ring-success/50' : ''
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                        event.event_type === 'carrier_verify'
                          ? 'bg-primary/10 text-primary'
                          : event.event_type === 'load_search'
                            ? 'bg-accent-warm/20 text-accent-warm'
                            : event.event_type === 'negotiate'
                              ? 'bg-warning/15 text-warning'
                              : event.event_type === 'call_logged'
                                ? 'bg-success/15 text-success'
                                : 'bg-surface-2 text-ink-muted'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ink">
                            {eventLabelMap[event.event_type] ?? event.event_type}
                          </span>
                          <span className="shrink-0 text-xs text-ink-muted">
                            {new Date(event.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-muted">
                          {describeEvent(event)}
                        </p>
                      </div>
                      {isLatest && isLive && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Negotiation Rounds Visual */}
          {call.counter_offers && call.counter_offers.length > 0 && (
            <div className="card">
              <h3 className="section-title mb-4">Negotiation Rounds</h3>
              <div className="space-y-3">
                {call.counter_offers.map((co, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-8 shrink-0 font-mono text-xs text-ink-muted">R{co.round}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-1.5 text-sm text-warning">
                        Carrier: {fmtCurrency(co.carrier)}
                      </div>
                      <span className="text-ink-muted">→</span>
                      {co.broker != null ? (
                        <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm text-primary">
                          Broker: {fmtCurrency(co.broker)}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-muted">no counter</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript Summary */}
          {call.transcript_summary && (
            <div className="card">
              <h3 className="section-title mb-3">Transcript Summary</h3>
              <p className="text-sm leading-relaxed text-ink">
                {call.transcript_summary}
              </p>
            </div>
          )}
        </div>

        {/* Right: Info Cards */}
        <div className="space-y-4">
          {/* Carrier Info */}
          <div className="card">
            <h3 className="section-title mb-3 flex items-center gap-2">
              <User size={16} /> Carrier Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Name</span>
                <span className="text-ink">{call.carrier_name || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">MC#</span>
                <span className="font-mono text-ink">{call.carrier_mc_number || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Caller</span>
                <span className="text-ink">{call.caller_name || '--'}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title mb-3 flex items-center gap-2">
              <Truck size={16} /> Load Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Origin</span>
                <span className="text-ink">{call.origin_requested || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Destination</span>
                <span className="text-ink">{call.destination_requested || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Equipment</span>
                <span className="text-ink">{call.equipment_requested || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Loadboard Rate</span>
                <span className="text-ink">{fmtCurrency(call.loadboard_rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Initial Offer</span>
                <span className="text-ink">{fmtCurrency(call.initial_offer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Agreed Rate</span>
                <span className="font-semibold text-success">{fmtCurrency(call.final_agreed_rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Rounds</span>
                <span className="text-ink">{call.negotiation_rounds}</span>
              </div>
            </div>
          </div>

          {call.notes && (
            <div className="card">
              <h3 className="section-title mb-3">Notes</h3>
              <p className="text-sm leading-relaxed text-ink">{call.notes}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
