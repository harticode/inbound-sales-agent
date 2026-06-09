'use client';

import { Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react';
import { useVoiceCall } from '@/providers/voice-call-provider';

export default function VoiceCallBar() {
  const { status, muted, callId, agentConnected, isActive, endCall, toggleMute } = useVoiceCall();

  if (!isActive) return null;

  return (
    <>
    <div aria-hidden className="h-[4.25rem]" />
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-canvas/95 shadow-elevated backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-success" />
          <span className="font-medium text-success">
            {status === 'connecting' && 'Connecting...'}
            {status === 'connected' && (agentConnected ? 'Live call' : 'Waiting for agent...')}
            {status === 'ending' && 'Ending call...'}
          </span>
          {callId && (
            <span className="font-mono text-xs text-ink-muted">{callId}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === 'connected' && (
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
            disabled={status === 'ending'}
            className="btn-danger disabled:opacity-50"
          >
            {status === 'ending' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <PhoneOff size={16} />
            )}
            End Call
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
