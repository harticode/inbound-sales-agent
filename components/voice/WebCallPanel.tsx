'use client';

import { useRouter } from 'next/navigation';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { useVoiceCall } from '@/hooks/use-voice-call';

export default function WebCallPanel() {
  const router = useRouter();
  const { status, muted, error, callId, agentConnected, isActive, startCall, endCall, toggleMute } = useVoiceCall();

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-ink">Web Call</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Start a live voice session with the HappyRobot carrier sales agent.
          </p>
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

          {!isActive ? (
            <button
              type="button"
              onClick={() => void startCall()}
              className="btn-primary"
            >
              <Phone size={16} />
              Start Call
            </button>
          ) : status === 'connecting' ? (
            <button
              type="button"
              disabled
              className="btn-primary opacity-50"
            >
              <Loader2 size={16} className="animate-spin" />
              Connecting...
            </button>
          ) : (
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
          )}
        </div>
      </div>

      {status === 'connecting' && (
        <p className="mt-3 text-xs text-primary">Connecting to agent — allow microphone access when prompted.</p>
      )}

      {status === 'connected' && callId && (
        <p className="mt-3 text-xs text-success">
          {agentConnected ? 'Agent connected — speak into your microphone.' : 'Connected — waiting for agent to join...'}{' '}
          <button
            type="button"
            onClick={() => router.push(`/calls/${callId}`)}
            className="font-mono underline hover:text-primary"
          >
            {callId}
          </button>
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
