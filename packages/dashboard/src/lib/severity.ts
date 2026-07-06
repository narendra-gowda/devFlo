/**
 * Shared severity → colour mapping so the same signal reads the same
 * everywhere (alerts page, campaign unit chips, count columns).
 *
 * Deliberately a *recognition* lookup, not a contract: categories are
 * adapter-defined opaque strings. Well-known severity-ish values get the
 * standard tones; anything else falls back to neutral — so a new adapter
 * with custom buckets renders fine with zero UI changes.
 */

export interface SeverityTone {
  pill: string;
  count: string;
}

const NEUTRAL: SeverityTone = {
  pill: "bg-panel2 text-muted ring-1 ring-edge2",
  count: "font-semibold text-ink",
};

const TONES: Record<string, SeverityTone> = {
  critical: { pill: "bg-critical/20 text-critical ring-1 ring-critical/50", count: "font-bold text-critical" },
  high: { pill: "bg-high/15 text-high ring-1 ring-high/35", count: "font-semibold text-high" },
  moderate: { pill: "bg-caution/15 text-caution ring-1 ring-caution/30", count: "font-semibold text-caution" },
  medium: { pill: "bg-caution/15 text-caution ring-1 ring-caution/30", count: "font-semibold text-caution" },
  low: { pill: "bg-edge2/40 text-muted ring-1 ring-edge2", count: "font-semibold text-muted" },
  code_scanning: { pill: "bg-accent2/15 text-accent2 ring-1 ring-accent2/30", count: "font-semibold text-accent2" },
};

export function severityTone(category: string | undefined): SeverityTone {
  return matchSeverityTone(category) ?? NEUTRAL;
}

/**
 * Like severityTone but returns undefined for unrecognised values — lets
 * generic renderers (e.g. UnitsTable) upgrade severity-looking strings to
 * pills while leaving all other values as plain text.
 */
export function matchSeverityTone(value: string | undefined): SeverityTone | undefined {
  if (!value) return undefined;
  return TONES[value.toLowerCase().replaceAll(" ", "_").replaceAll("-", "_")];
}
