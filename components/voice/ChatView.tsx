import { useEffect, useRef } from 'react';
import { Bot, User, Radio } from 'lucide-react';
import type { CallEvent } from '@/types';

interface TranscriptMessage {
  role: string;
  content: string;
  timestamp: string;
}

interface Props {
  events: CallEvent[];
  isLive: boolean;
  transcriptMessages?: TranscriptMessage[];
}

interface ChatBubble {
  sender: 'agent' | 'carrier' | 'system';
  text: string;
  timestamp: string;
  id: string;
}

function fmtCurrency(val: number): string {
  return `$${val.toLocaleString()}`;
}

function eventsToBubbles(events: CallEvent[]): ChatBubble[] {
  const bubbles: ChatBubble[] = [];
  let id = 0;

  if (events.length > 0) {
    bubbles.push({
      sender: 'agent',
      text: "Thanks for calling Acme Logistics, this is the carrier sales desk. I'd be happy to help you find a load today. Could I get your MC number to get started?",
      timestamp: events[0].created_at,
      id: `r-${id++}`,
    });
  }

  for (const event of events) {
    const p = (event.payload ?? {}) as Record<string, any>;

    switch (event.event_type) {
      case 'carrier_verify': {
        bubbles.push({
          sender: 'carrier',
          text: `My MC number is ${p.mc_number ?? '—'}.`,
          timestamp: event.created_at,
          id: `r-${id++}`,
        });
        if (p.is_eligible) {
          bubbles.push({
            sender: 'agent',
            text: `Great, I've got you verified — ${p.legal_name ?? 'carrier'}, authorized to operate. What lane are you looking for today?`,
            timestamp: event.created_at,
            id: `r-${id++}`,
          });
        } else {
          bubbles.push({
            sender: 'agent',
            text: `I'm sorry, your authority isn't showing as active — ${p.reason ?? 'unable to verify'}. I can't book loads with unauthorized carriers.`,
            timestamp: event.created_at,
            id: `r-${id++}`,
          });
        }
        break;
      }
      case 'load_search': {
        const parts = [p.origin, p.destination].filter(Boolean);
        const lane = parts.length === 2 ? `${parts[0]} to ${parts[1]}` : parts[0] || 'your area';
        const equip = p.equipment ? `, ${p.equipment}` : '';
        bubbles.push({
          sender: 'carrier',
          text: `I've got a truck${equip}. Looking for something from ${lane}.`,
          timestamp: event.created_at,
          id: `r-${id++}`,
        });
        const count = p.results_count ?? 0;
        bubbles.push({
          sender: 'agent',
          text: count > 0
            ? `I've got ${count > 1 ? `${count} loads` : 'a great load'} on that lane. Let me pull up the details for you...`
            : "I don't have anything on that lane right now. Sorry about that.",
          timestamp: event.created_at,
          id: `r-${id++}`,
        });
        break;
      }
      case 'negotiate': {
        const offer = p.carrier_offer ? fmtCurrency(Number(p.carrier_offer)) : '—';
        const counter = p.counter_offer ? fmtCurrency(Number(p.counter_offer)) : null;
        const round = p.round ?? '?';
        bubbles.push({
          sender: 'carrier',
          text: round === 1
            ? `That rate's a bit low. Can you do ${offer}?`
            : `How about ${offer}? That's the best I can do.`,
          timestamp: event.created_at,
          id: `r-${id++}`,
        });
        if (p.accepted) {
          bubbles.push({ sender: 'agent', text: `That works — ${offer}, let me lock that in for you.`, timestamp: event.created_at, id: `r-${id++}` });
        } else if (counter) {
          bubbles.push({ sender: 'agent', text: `I hear you, but the best I can do is ${counter}. That's a solid rate for this lane — can we lock it in?`, timestamp: event.created_at, id: `r-${id++}` });
        } else {
          bubbles.push({ sender: 'agent', text: p.message ?? "That's the lowest we can go on this one.", timestamp: event.created_at, id: `r-${id++}` });
        }
        break;
      }
      case 'call_logged': {
        const outcome = (p.outcome ?? '') as string;
        const messages: Record<string, string> = {
          transferred: "Transfer was successful. A sales rep will finalize the paperwork. Thanks for calling Acme Logistics!",
          booked: "Great doing business with you. Thanks for calling Acme Logistics!",
          declined: "No worries at all. Give us a call back anytime. Take care!",
          negotiation_failed: "I understand. Give us a call back if anything changes. Take care!",
          no_loads: "Sorry I couldn't help today. Give us a call back tomorrow — inventory changes fast.",
          carrier_not_eligible: "Unfortunately I can't proceed without active authority. Once that's resolved, give us a call back.",
        };
        bubbles.push({ sender: 'agent', text: messages[outcome] ?? "Thanks for calling Acme Logistics!", timestamp: event.created_at, id: `r-${id++}` });
        break;
      }
    }
  }

  return bubbles;
}

function transcriptToBubbles(messages: TranscriptMessage[]): ChatBubble[] {
  return messages.map((msg, i) => ({
    sender: (msg.role === 'assistant' || msg.role === 'agent' || msg.role === 'bot') ? 'agent' : 'carrier',
    text: msg.content,
    timestamp: msg.timestamp,
    id: `t-${i}`,
  }));
}

export default function ChatView({ events, isLive, transcriptMessages = [] }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasRealTranscript = transcriptMessages.length > 0;
  const bubbles = hasRealTranscript
    ? transcriptToBubbles(transcriptMessages)
    : eventsToBubbles(events);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles.length]);

  if (bubbles.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-muted">
        Waiting for conversation to start...
        {isLive && (
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
            listening
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {hasRealTranscript && (
        <div className="mb-3 flex items-center gap-2 text-xs text-success">
          <Radio size={12} />
          <span>Live transcript from HappyRobot</span>
        </div>
      )}
      {!hasRealTranscript && events.length > 0 && (
        <div className="mb-3 text-xs text-ink-muted">
          Conversation reconstructed from call events
        </div>
      )}

      <div ref={scrollRef} className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
        {bubbles.map((bubble, idx) => {
          const isAgent = bubble.sender === 'agent';
          const isLatest = idx === bubbles.length - 1;

          return (
            <div
              key={bubble.id}
              className={`flex items-end gap-2.5 ${isAgent ? 'justify-start' : 'justify-end'}`}
            >
              {isAgent && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot size={16} className="text-primary" />
                </div>
              )}

              <div className={`max-w-[75%] rounded-lg px-4 py-3 ${
                isAgent
                  ? 'rounded-bl-sm border border-border bg-canvas'
                  : 'rounded-br-sm bg-surface-2'
              } ${isLatest && isLive ? 'ring-1 ring-success/40' : ''}`}>
                <p className="text-sm leading-relaxed text-ink">
                  {bubble.text}
                </p>
                <p className="mt-1 text-[10px] text-ink-muted">
                  {new Date(bubble.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>

              {!isAgent && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-1">
                  <User size={16} className="text-primary" />
                </div>
              )}
            </div>
          );
        })}

        {isLive && (
          <div className="flex items-end gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot size={16} className="text-primary" />
            </div>
            <div className="rounded-lg rounded-bl-sm border border-border bg-canvas px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-muted" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-muted" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink-muted" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
