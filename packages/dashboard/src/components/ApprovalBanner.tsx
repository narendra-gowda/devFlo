import { ShieldAlert } from "lucide-react";
import { useRole } from "../context/role";

/**
 * The human-in-the-loop gate, rendered as a first-class UI element.
 * Phase 1: approvals still happen in the CLI; Phase 2 makes these buttons live
 * (async approval on the shared VM). Buttons exist now so the layout,
 * permissions and data flow are already proven.
 */
export function ApprovalBanner({ count, campaignId }: { count: number; campaignId: string }) {
  const { can } = useRole();
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1 text-sm">
        <span className="font-semibold text-amber-900">
          {count} item{count === 1 ? "" : "s"} awaiting human approval.
        </span>{" "}
        <span className="text-amber-800">
          Nothing executes until approved — run{" "}
          <code className="rounded bg-amber-100 px-1 font-mono text-xs">
            devflo approve {campaignId}
          </code>{" "}
          in the CLI.
        </span>
      </div>
      {can.approve && (
        <div className="flex gap-2">
          <button
            disabled
            title="In-dashboard async approval arrives in Phase 2 — approve via the CLI for now"
            className="rounded-md bg-amber-200 px-3 py-1.5 text-xs font-medium text-amber-900 opacity-60 cursor-not-allowed"
          >
            Approve…
          </button>
          <button
            disabled
            title="In-dashboard async approval arrives in Phase 2 — approve via the CLI for now"
            className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 opacity-60 cursor-not-allowed"
          >
            Skip…
          </button>
        </div>
      )}
    </div>
  );
}
