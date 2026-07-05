import type { CampaignStatus, ItemStatus, Strategy } from "@devflo/schema";

/**
 * Status rendering is a pure lookup over schema enums — no campaign-type
 * logic anywhere. Adding a new campaign type requires zero changes here.
 */

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1";

/** Campaign status: Linear-style glowing dot + label. */
const CAMPAIGN_DOTS: Record<CampaignStatus, { dot: string; glow?: string }> = {
  DRAFT: { dot: "bg-dim" },
  AWAITING_APPROVAL: { dot: "bg-warn", glow: "0 0 8px var(--color-warn)" },
  IN_PROGRESS: { dot: "bg-info", glow: "0 0 8px var(--color-info)" },
  COMPLETED: { dot: "bg-ok", glow: "0 0 8px var(--color-ok)" },
  FAILED: { dot: "bg-danger", glow: "0 0 8px var(--color-danger)" },
  PAUSED: { dot: "bg-dim" },
};

const ITEM_STYLES: Record<ItemStatus, string> = {
  PENDING_APPROVAL: "bg-warn/15 text-warn ring-warn/30",
  APPROVED: "bg-accent/15 text-accent2 ring-accent/30",
  SKIPPED: "bg-edge2/40 text-muted ring-edge2",
  IN_PROGRESS: "bg-info/15 text-info ring-info/30",
  TESTS_FAILED: "bg-danger/15 text-danger ring-danger/35",
  PR_RAISED: "bg-accent2/15 text-accent2 ring-accent2/30",
  MERGED: "bg-ok/15 text-ok ring-ok/30",
  NEEDS_ATTENTION: "bg-danger/20 text-danger ring-danger/45",
};

function label(status: string): string {
  return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const s = CAMPAIGN_DOTS[status];
  return (
    <span className="inline-flex items-center gap-[7px] whitespace-nowrap text-xs font-medium text-ink">
      <span
        className={`h-[7px] w-[7px] rounded-full ${s.dot}`}
        style={s.glow ? { boxShadow: s.glow } : undefined}
      />
      {label(status)}
    </span>
  );
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return <span className={`${pill} ${ITEM_STYLES[status]}`}>{label(status)}</span>;
}

export function StrategyBadge({ strategy }: { strategy: Strategy }) {
  return (
    <span
      className={`${pill} ${
        strategy === "AUTO_FIX"
          ? "bg-ok/10 text-ok ring-ok/25"
          : "bg-accent2/10 text-accent2 ring-accent2/25"
      }`}
    >
      {strategy === "AUTO_FIX" ? "auto-fix" : "manual review"}
    </span>
  );
}
