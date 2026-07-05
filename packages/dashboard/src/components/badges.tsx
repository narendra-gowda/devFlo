import type { CampaignStatus, ItemStatus, Strategy } from "@devflo/schema";

/**
 * Status/risk rendering is a pure lookup over schema enums — no campaign-type
 * logic anywhere. Adding a new campaign type requires zero changes here.
 */

const base =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const CAMPAIGN_STATUS_STYLES: Record<CampaignStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  AWAITING_APPROVAL: "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
  IN_PROGRESS: "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
  COMPLETED: "bg-green-100 text-green-800 ring-1 ring-green-200",
  FAILED: "bg-red-100 text-red-800 ring-1 ring-red-200",
  PAUSED: "bg-slate-200 text-slate-600 ring-1 ring-slate-300",
};

const ITEM_STATUS_STYLES: Record<ItemStatus, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
  APPROVED: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  SKIPPED: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  IN_PROGRESS: "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
  TESTS_FAILED: "bg-red-100 text-red-800 ring-1 ring-red-300",
  PR_RAISED: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
  MERGED: "bg-green-100 text-green-800 ring-1 ring-green-200",
  NEEDS_ATTENTION: "bg-rose-100 text-rose-800 ring-1 ring-rose-300",
};

function label(status: string): string {
  return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <span className={`${base} ${CAMPAIGN_STATUS_STYLES[status]}`}>{label(status)}</span>;
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return <span className={`${base} ${ITEM_STATUS_STYLES[status]}`}>{label(status)}</span>;
}

export function StrategyBadge({ strategy }: { strategy: Strategy }) {
  return (
    <span
      className={`${base} ${
        strategy === "AUTO_FIX"
          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
          : "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
      }`}
    >
      {strategy === "AUTO_FIX" ? "auto-fix" : "manual review"}
    </span>
  );
}
