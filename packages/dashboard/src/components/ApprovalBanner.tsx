/**
 * The human-in-the-loop gate, rendered as a first-class UI element.
 * Phase 1: approvals happen in the CLI; Phase 2 brings async in-dashboard
 * approval on the shared VM.
 */
export function ApprovalBanner({ count, campaignId }: { count: number; campaignId: string }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-warn/25 bg-warn/[.07] px-4 py-[11px]">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-warn shadow-[0_0_0_4px_rgba(245,177,83,.15),0_0_14px_rgba(245,177,83,.6)]" />
      <p className="text-[13px] text-ink">
        <span className="font-semibold">
          {count} item{count === 1 ? "" : "s"} awaiting human approval.
        </span>{" "}
        <span className="text-muted">Nothing executes until sign-off —</span>{" "}
        <code className="rounded-[5px] border border-warn/25 bg-[#242013] px-1.5 py-px font-mono text-[11.5px] text-warn">
          devflo approve {campaignId}
        </code>
      </p>
    </div>
  );
}
