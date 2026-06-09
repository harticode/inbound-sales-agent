"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { HappyRobotVoiceClient, type VoiceConnection } from "@happyrobot-ai/sdk/voice";
import { api } from "@/lib/api-client";

type CallStatus = "idle" | "connecting" | "connected" | "ending" | "error";

type VoiceCallContextValue = {
  status: CallStatus;
  muted: boolean;
  error: string | null;
  callId: string | null;
  agentConnected: boolean;
  isActive: boolean;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => Promise<void>;
};

const VoiceCallContext = createContext<VoiceCallContextValue | null>(null);

function markAgentIfPresent(connection: VoiceConnection, onFound: () => void) {
  for (const participant of connection.room.remoteParticipants.values()) {
    if (participant.identity !== "browser") {
      onFound();
      return;
    }
  }
}

export function VoiceCallProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const connectionRef = useRef<VoiceConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const endingRef = useRef(false);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [agentConnected, setAgentConnected] = useState(false);

  const endCall = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setStatus("ending");

    try {
      await connectionRef.current?.disconnect();
    } catch {
      /* ignore disconnect errors */
    }
    connectionRef.current = null;

    const activeCallId = callIdRef.current;
    if (activeCallId) {
      try {
        await api.notifyCallEnded({ call_id: activeCallId });
      } catch {
        /* ignore */
      }
    }

    callIdRef.current = null;
    setCallId(null);
    setMuted(false);
    setAgentConnected(false);
    setStatus("idle");
    endingRef.current = false;
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      void connectionRef.current?.disconnect();
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const startCall = useCallback(async () => {
    if (connectionRef.current || status === "connecting" || status === "connected") return;

    setError(null);
    setStatus("connecting");
    setAgentConnected(false);

    try {
      const token = await api.createVoiceToken();
      callIdRef.current = token.call_id;
      setCallId(token.call_id);

      await api.notifyCallStarted({ run_id: token.run_id, call_id: token.call_id });

      const voice = new HappyRobotVoiceClient({ url: token.url, token: token.token });
      const connection = await voice.connect({
        onConnected: () => {
          setStatus("connected");
          router.push(`/calls/${token.call_id}`);
        },
        onAgentConnected: () => {
          setAgentConnected(true);
        },
        onDisconnected: () => {
          if (!endingRef.current) {
            void endCall();
          }
        },
        onError: (err) => {
          setError(err.message);
          setStatus("error");
        },
      });
      connectionRef.current = connection;
      markAgentIfPresent(connection, () => setAgentConnected(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start call");
      setStatus("error");
      callIdRef.current = null;
      setCallId(null);
      setAgentConnected(false);
    }
  }, [endCall, router, status]);

  const toggleMute = useCallback(async () => {
    if (!connectionRef.current) return;
    if (muted) {
      await connectionRef.current.unmute();
      setMuted(false);
    } else {
      await connectionRef.current.mute();
      setMuted(true);
    }
  }, [muted]);

  const isActive = status === "connecting" || status === "connected" || status === "ending";

  return (
    <VoiceCallContext.Provider
      value={{
        status,
        muted,
        error,
        callId,
        agentConnected,
        isActive,
        startCall,
        endCall,
        toggleMute,
      }}
    >
      {children}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error("useVoiceCall must be used within VoiceCallProvider");
  }
  return context;
}
