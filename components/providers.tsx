'use client';

import type { ReactNode } from 'react';
import { VoiceCallProvider } from '@/providers/voice-call-provider';
import VoiceCallBar from '@/components/voice/VoiceCallBar';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <VoiceCallProvider>
      {children}
      <VoiceCallBar />
    </VoiceCallProvider>
  );
}
