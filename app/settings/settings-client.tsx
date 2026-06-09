'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, RotateCcw, Plus, X, KeyRound, CheckCircle2, AlertCircle,
  Handshake, DollarSign, ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type {
  SettingsValues,
  SettingsSchema,
  SettingsKind,
  SecretView,
  LabeledListEntry,
  NegotiationPostureSettings,
} from '@/types';
import { defaultNegotiationPostureSettings } from '@/services/negotiation';
import { NegotiationPostureFields } from './negotiation-posture-fields';

type SectionKey = 'negotiation' | 'roi' | 'fmcsa';

const SECTIONS: Record<SectionKey, { title: string; subtitle: string; icon: typeof Save; keys: string[] }> = {
  negotiation: {
    title: 'Negotiation strategy',
    subtitle: 'How the agent pitches and counters carrier offers.',
    icon: Handshake,
    keys: ['offer_rate_pct', 'negotiation_min_margin_pct'],
  },
  roi: {
    title: 'Agent ROI assumptions',
    subtitle: 'Drives the "Agent Impact" panel — set these to your own workforce numbers.',
    icon: DollarSign,
    keys: ['agent_avg_human_handle_minutes', 'agent_avg_human_cost_per_call'],
  },
  fmcsa: {
    title: 'Carrier verification',
    subtitle: 'How long FMCSA cache entries are trusted before re-verifying.',
    icon: ShieldCheck,
    keys: ['carrier_cache_ttl_hours'],
  },
};

const LABELS: Record<string, string> = {
  offer_rate_pct: 'Initial offer (% of loadboard)',
  negotiation_min_margin_pct: 'Minimum margin floor (%)',
  carrier_cache_ttl_hours: 'FMCSA cache TTL (hours)',
  agent_avg_human_handle_minutes: 'Avg human handle time (minutes)',
  agent_avg_human_cost_per_call: 'Avg human cost per call ($)',
};

const HINTS: Record<string, string> = {
  offer_rate_pct: 'Example: 0.85 pitches 85% of the loadboard rate at the start of negotiation.',
  negotiation_min_margin_pct:
    'Example: 0.05 = never accept when broker margin would fall below 5% of loadboard. ' +
    'Stretch accepts above loadboard still apply for balanced and win_capacity postures.',
  agent_avg_human_handle_minutes: 'Used as the time saved per automated call vs. a human handling it manually.',
  agent_avg_human_cost_per_call: 'Used as the cost saved per call vs. paying a human dispatcher.',
};

type Toast = { kind: 'ok' | 'err'; text: string } | null;

// Dirty-state shapes for the credential kinds (must match what the backend
// accepts on PATCH — see runtime_settings.py:update_runtime_settings).
type SecretWrite = { label: string; value: string };
type LabeledListWrite = Array<{ id?: string; label: string; number?: string }>;

export default function SettingsPage() {
  const router = useRouter();
  const [values, setValues] = useState<SettingsValues | null>(null);
  const [schema, setSchema] = useState<SettingsSchema | null>(null);
  const [dirty, setDirty] = useState<SettingsValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    let cancelled = false;
    api.getSettings()
      .then((d) => { if (!cancelled) { setValues(d.values); setSchema(d.schema); } })
      .catch((e) => setToast({ kind: 'err', text: `Failed to load settings: ${e.message}` }))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function updateDirty(key: string, value: unknown) {
    setDirty((d) => ({ ...d, [key]: value }));
  }

  function current<T = unknown>(key: string): T {
    if (key in dirty) return dirty[key] as T;
    return (values?.[key] ?? schema?.[key]?.default) as T;
  }

  async function save() {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true); setToast(null);
    try {
      const res = await api.updateSettings(dirty);
      setValues(res.values);
      setDirty({});
      setToast({ kind: 'ok', text: 'Settings saved.' });
    } catch (e) {
      setToast({ kind: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm('Reset every setting to its built-in default? This wipes your customisations.')) return;
    setSaving(true); setToast(null);
    try {
      const res = await api.resetSettings();
      setValues(res.values);
      setDirty({});
      setToast({ kind: 'ok', text: 'All settings reset to defaults.' });
    } catch (e) {
      setToast({ kind: 'err', text: e instanceof Error ? e.message : 'Reset failed' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-[960px] px-6 py-16 text-ink-muted lg:py-24">Loading settings…</main>;
  }
  if (!values || !schema) {
    return <main className="mx-auto max-w-[960px] px-6 py-16 text-danger lg:py-24">Failed to load settings.</main>;
  }

  return (
    <main className="mx-auto max-w-[960px] space-y-6 px-6 py-16 lg:py-24">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-ink">Settings</h2>
          <p className="text-sm text-ink-muted">Operator-tunable runtime configuration. Saved to the backend database — survives container restarts.</p>
        </div>
        <button
          onClick={reset}
          className="btn-ghost min-h-0 px-3 py-2 text-xs"
        >
          <RotateCcw size={13} /> Reset to defaults
        </button>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
          toast.kind === 'ok' ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'
        }`}>
          {toast.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {(Object.keys(SECTIONS) as SectionKey[]).map((sectionKey) => {
        const section = SECTIONS[sectionKey];
        const Icon = section.icon;
        return (
          <section key={sectionKey} className="card">
            <header className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-medium text-ink">{section.title}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">{section.subtitle}</p>
              </div>
            </header>
            <div className="space-y-4">
              {section.keys.map((key) => (
                <Field
                  key={key}
                  fieldKey={key}
                  kind={schema[key]?.kind ?? 'string'}
                  label={LABELS[key] ?? key}
                  hint={HINTS[key]}
                  value={current(key)}
                  isDirty={key in dirty}
                  onChange={(v) => updateDirty(key, v)}
                />
              ))}
              {sectionKey === 'negotiation' && (
                <div className="border-t border-border pt-5">
                  <NegotiationPostureFields
                    value={(current('negotiation_posture_config') as NegotiationPostureSettings)
                      ?? defaultNegotiationPostureSettings(
                        (current('negotiation_min_margin_pct') as number) ?? 0.05,
                      )}
                    isDirty={'negotiation_posture_config' in dirty}
                    onChange={(v) => updateDirty('negotiation_posture_config', v)}
                  />
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-md border border-border bg-canvas/95 px-4 py-3 shadow-elevated backdrop-blur-sm">
        <span className="text-sm text-ink-muted">
          {Object.keys(dirty).length === 0
            ? 'No pending changes'
            : `${Object.keys(dirty).length} change${Object.keys(dirty).length > 1 ? 's' : ''} pending`}
        </span>
        <button
          onClick={save}
          disabled={saving || Object.keys(dirty).length === 0}
          className="btn-primary"
        >
          <Save size={15} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </main>
  );
}

// ── Field renderer ─────────────────────────────────────────────────────

function Field({
  fieldKey, kind, label, hint, value, isDirty, onChange,
}: {
  fieldKey: string;
  kind: SettingsKind;
  label: string;
  hint?: string;
  value: unknown;
  isDirty: boolean;
  onChange: (v: unknown) => void;
}) {
  if (kind === 'boolean') {
    return (
      <div>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <div className="text-sm font-medium text-ink">{label}</div>
            {hint && <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>}
          </div>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 rounded border-border bg-surface-2 text-primary focus:ring-2 focus:ring-primary/40"
          />
        </label>
      </div>
    );
  }

  if (kind === 'secret') {
    return <SecretField label={label} hint={hint} value={value as SecretView | SecretWrite | undefined} isDirty={isDirty} onChange={onChange} />;
  }

  if (kind === 'labeled_list') {
    return <LabeledListField label={label} hint={hint} value={value as LabeledListEntry[] | LabeledListWrite | undefined} isDirty={isDirty} onChange={onChange} />;
  }

  // Legacy 'array' kind kept for non-credential use cases (none right now,
  // but keep the renderer alive in case a future setting needs it).
  if (kind === 'array') {
    const items = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        <div className="mb-2 text-sm font-medium text-ink">{label}</div>
        {hint && <div className="mb-2 text-xs text-ink-muted">{hint}</div>}
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                className="flex-1 rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="rounded-lg border border-border bg-canvas px-2 text-ink-muted hover:text-danger hover:border-danger/40 transition-colors"
                aria-label="Remove"
              >
                <X size={15} />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange([...items, ''])}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-transparent px-3 py-1.5 text-xs text-ink-muted hover:text-primary hover:border-primary/50 transition-colors"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>
    );
  }

  // string / number / integer
  void fieldKey;
  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      {hint && <div className="mt-0.5 mb-1.5 text-xs text-ink-muted">{hint}</div>}
      <input
        type={kind === 'string' ? 'text' : 'number'}
        step={kind === 'integer' ? 1 : 'any'}
        value={value == null ? '' : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (kind === 'string') onChange(raw);
          else if (raw === '') onChange(0);
          else onChange(kind === 'integer' ? parseInt(raw, 10) : parseFloat(raw));
        }}
        className="mt-1 block w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
      />
    </div>
  );
}

// ── Secret field: label + "configured" badge, never the raw value ─────

function SecretField({
  label, hint, value, isDirty, onChange,
}: {
  label: string;
  hint?: string;
  value: SecretView | SecretWrite | undefined;
  isDirty: boolean;
  onChange: (v: SecretWrite) => void;
}) {
  // The server returns {label, configured}. Once the user edits, the dirty
  // state becomes {label, value} — same shape minus the configured flag.
  const view = (value ?? { label: '', configured: false }) as Partial<SecretView & SecretWrite>;
  const currentLabel = view.label || '';
  const isConfigured = Boolean(view.configured) || isDirty;

  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(currentLabel);
  const [draftValue, setDraftValue] = useState('');

  function startEdit() {
    setDraftLabel(currentLabel);
    setDraftValue('');
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setDraftValue('');
  }

  function stage() {
    const labelClean = draftLabel.trim();
    const valueClean = draftValue.trim();
    if (!labelClean) return;
    if (!isConfigured && !valueClean) return;  // can't add a new credential without a value
    onChange({ label: labelClean, value: valueClean });
    setEditing(false);
    setDraftValue('');
  }

  return (
    <div>
      <div className="text-sm font-medium text-ink">{label}</div>
      {hint && <div className="mt-0.5 mb-2 text-xs text-ink-muted">{hint}</div>}

      {!editing && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-canvas px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <KeyRound size={15} className={isConfigured ? 'text-success shrink-0' : 'text-ink-muted shrink-0'} />
            <span className={`truncate text-sm ${isConfigured ? 'text-ink' : 'text-ink-muted italic'}`}>
              {isConfigured ? (currentLabel || '(unlabeled)') : 'Not configured'}
            </span>
            {isConfigured && (
              <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                {isDirty ? 'Pending' : 'Configured'}
              </span>
            )}
          </div>
          <button
            onClick={startEdit}
            className="shrink-0 rounded-md border border-border bg-canvas px-2.5 py-1 text-xs text-ink hover:text-ink hover:border-primary transition-colors"
          >
            {isConfigured ? 'Replace' : 'Add'}
          </button>
        </div>
      )}

      {editing && (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <input
            type="text"
            placeholder='Label (e.g. "Production API token")'
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            className="block w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
          />
          <input
            type="password"
            placeholder={isConfigured ? 'Value (leave empty to keep current)' : 'Value'}
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="block w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink font-mono focus:border-primary focus:outline-none"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={cancel}
              className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={stage}
              disabled={!draftLabel.trim() || (!isConfigured && !draftValue.trim())}
              className="btn-primary min-h-0 px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Stage change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Labeled list field: label-only rows + add form, numbers never shown ──

function LabeledListField({
  label, hint, value, isDirty, onChange,
}: {
  label: string;
  hint?: string;
  value: LabeledListEntry[] | LabeledListWrite | undefined;
  isDirty: boolean;
  onChange: (v: LabeledListWrite) => void;
}) {
  const items = (Array.isArray(value) ? value : []) as LabeledListWrite;
  const [newLabel, setNewLabel] = useState('');
  const [newNumber, setNewNumber] = useState('');

  function remove(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  }

  function add() {
    const lbl = newLabel.trim();
    const num = newNumber.trim();
    if (!lbl || !num) return;
    onChange([...items, { label: lbl, number: num }]);
    setNewLabel('');
    setNewNumber('');
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-ink">{label}</div>
        {isDirty && (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
            Pending
          </span>
        )}
      </div>
      {hint && <div className="mt-0.5 mb-2 text-xs text-ink-muted">{hint}</div>}

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-surface-1 px-3 py-2.5 text-xs text-ink-muted italic">
            No recipients configured yet.
          </div>
        )}
        {items.map((item, i) => {
          const isExisting = !!item.id;
          return (
            <div key={item.id ?? `new-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-canvas px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-sm text-ink">{item.label || '(unlabeled)'}</span>
                {!isExisting && (
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                    New
                  </span>
                )}
              </div>
              <button
                onClick={() => remove(i)}
                className="shrink-0 rounded-md border border-border bg-transparent px-2 py-1 text-ink-muted hover:text-danger hover:border-danger/40 transition-colors"
                aria-label="Remove recipient"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}

        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-surface-1 p-3 sm:flex-row">
          <input
            type="text"
            placeholder='Label (e.g. "Sales desk")'
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
          />
          <input
            type="tel"
            placeholder="+15551234567"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            className="flex-1 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink font-mono focus:border-primary focus:outline-none"
          />
          <button
            onClick={add}
            disabled={!newLabel.trim() || !newNumber.trim()}
            className="flex items-center justify-center gap-1.5 btn-primary min-h-0 px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
