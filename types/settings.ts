export type SettingsKind =
  | "boolean"
  | "integer"
  | "number"
  | "string"
  | "array"
  | "json"
  | "secret"
  | "labeled_list";

export type SecretView = { label: string; configured: boolean };
export type LabeledListEntry = { id: string; label: string };
export type SettingsValues = Record<string, unknown>;
export type SettingsSchema = Record<string, { kind: SettingsKind; default: unknown }>;
