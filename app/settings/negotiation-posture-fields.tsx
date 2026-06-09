'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  DemandNegotiationPosture,
  NegotiationPostureSettings,
  PostureSettingsValues,
} from '@/types';
import { POSTURE_LABELS } from '@/services/negotiation';

const POSTURES: DemandNegotiationPosture[] = [
  'protect_margin',
  'balanced',
  'win_capacity',
];

type FieldDef = {
  key: keyof PostureSettingsValues;
  label: string;
  hint?: string;
  step?: string;
};

const FIELDS: FieldDef[] = [
  {
    key: 'min_margin_pct',
    label: 'Minimum margin floor (%)',
    hint: 'Overrides the global margin floor for this posture.',
  },
  { key: 'max_over_loadboard', label: 'Max over loadboard (×)', hint: 'Example: 1.05 = up to 5% above loadboard.' },
  { key: 'near_accept_pct', label: 'Near-accept band (%)', hint: 'Accept when carrier is within this % of the planned counter.' },
  { key: 'minimum_counter_gap', label: 'Minimum counter gap ($)', hint: 'Never counter within this dollar amount of the carrier ask.' },
  { key: 'gap_share_round_1', label: 'Gap share round 1', hint: 'Share of the gap the broker moves toward the carrier in round 1.' },
  { key: 'gap_share_round_2', label: 'Gap share round 2' },
  { key: 'gap_share_round_3', label: 'Gap share round 3' },
  { key: 'round_1_accept_pct', label: 'Round 1 accept threshold (%)', hint: 'Max discount from loadboard to accept in round 1.' },
  { key: 'round_1_counter_pct', label: 'Round 1 counter ceiling (%)', hint: 'Paced counter target as % of loadboard by end of round 1.' },
  { key: 'round_2_accept_pct', label: 'Round 2 accept threshold (%)' },
  { key: 'round_2_counter_pct', label: 'Round 2 counter ceiling (%)' },
  { key: 'round_3_accept_pct', label: 'Round 3 accept threshold (%)' },
  { key: 'round_3_counter_pct', label: 'Round 3 counter ceiling (%)' },
];

export function NegotiationPostureFields({
  value,
  isDirty,
  onChange,
}: {
  value: NegotiationPostureSettings;
  isDirty: boolean;
  onChange: (value: NegotiationPostureSettings) => void;
}) {
  const [openPosture, setOpenPosture] = useState<DemandNegotiationPosture | null>('protect_margin');

  function updatePostureField(
    posture: DemandNegotiationPosture,
    key: keyof PostureSettingsValues,
    raw: string,
  ) {
    const parsed = raw === '' ? 0 : parseFloat(raw);
    onChange({
      ...value,
      [posture]: {
        ...value[posture],
        [key]: Number.isFinite(parsed) ? parsed : 0,
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-ink">Per-posture tuning</h4>
        {isDirty && (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
            Pending
          </span>
        )}
      </div>
      <p className="text-xs text-ink-muted">
        Counter curves, gap-share, near-accept bands, and margin floors by demand posture.
        Global settings above still apply unless overridden here.
      </p>

      {POSTURES.map((posture) => {
        const meta = POSTURE_LABELS[posture];
        const isOpen = openPosture === posture;
        return (
          <div key={posture} className="overflow-hidden rounded-lg border border-border bg-surface-1">
            <button
              type="button"
              onClick={() => setOpenPosture(isOpen ? null : posture)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
            >
              <div>
                <div className="text-sm font-medium text-ink">{meta.title}</div>
                <div className="text-xs text-ink-muted">{meta.description}</div>
              </div>
              <ChevronDown
                size={16}
                className={`shrink-0 text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isOpen && (
              <div className="grid gap-4 border-t border-border px-4 py-4 sm:grid-cols-2">
                {FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-ink">{field.label}</label>
                    {field.hint && (
                      <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{field.hint}</p>
                    )}
                    <input
                      type="number"
                      step={field.step ?? 'any'}
                      value={value[posture][field.key]}
                      onChange={(e) => updatePostureField(posture, field.key, e.target.value)}
                      className="mt-1.5 block w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
