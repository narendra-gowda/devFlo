import type { CampaignItem, ItemStatus, RepoRegistry } from "@devflo/schema";
import { buildMatrix, cellKey } from "../lib/matrix";
import { panel } from "../components/ui";

/**
 * Issue × repo matrix. Fully generic: rows come from unit keys (or item
 * issueKey), whatever the adapter chose those to be. Cell colour is a pure
 * function of ItemStatus.
 */

type CellState = "open" | "pr" | "merged" | "skipped" | "attention";

const STATUS_TO_STATE: Record<ItemStatus, CellState> = {
  PENDING_APPROVAL: "open",
  APPROVED: "open",
  IN_PROGRESS: "open",
  TESTS_FAILED: "attention",
  NEEDS_ATTENTION: "attention",
  PR_RAISED: "pr",
  MERGED: "merged",
  SKIPPED: "skipped",
};

const STATE_STYLES: Record<CellState, string> = {
  open: "bg-warn shadow-[0_0_8px_rgba(245,177,83,.45)]",
  pr: "bg-accent shadow-[0_0_8px_rgba(139,124,247,.45)]",
  merged: "bg-ok shadow-[0_0_8px_rgba(63,221,157,.4)]",
  skipped: "bg-edge2",
  attention: "bg-danger shadow-[0_0_8px_rgba(241,106,106,.5)]",
};

const LEGEND: { label: string; cls: string }[] = [
  { label: "Open (pending / approved / in progress)", cls: "bg-warn" },
  { label: "Needs attention / tests failed", cls: "bg-danger" },
  { label: "PR raised", cls: "bg-accent" },
  { label: "Merged", cls: "bg-ok" },
  { label: "Skipped", cls: "bg-edge2" },
  { label: "Not affected", cls: "border border-edge2 bg-panel2" },
];

function Cell({ item }: { item?: CampaignItem }) {
  if (!item) {
    return <div className="mx-auto h-5 w-5 rounded-sm border border-edge2 bg-panel2" title="Not affected" />;
  }
  const state = STATUS_TO_STATE[item.status];
  const box = (
    <div
      className={`mx-auto h-5 w-5 rounded-sm ${STATE_STYLES[state]} ${item.prUrl ? "cursor-pointer hover:ring-2 hover:ring-accent2" : ""}`}
      title={`${item.org}/${item.repo} — ${item.description}\nStatus: ${item.status}`}
    />
  );
  return item.prUrl ? (
    <a href={item.prUrl} target="_blank" rel="noreferrer">
      {box}
    </a>
  ) : (
    box
  );
}

export function MatrixView({
  items,
  registry,
}: {
  items: CampaignItem[];
  registry: RepoRegistry;
}) {
  const matrix = buildMatrix(items, registry);

  if (matrix.rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        No items in this campaign carry <code className="font-mono">units</code> or an{" "}
        <code className="font-mono">issueKey</code>, so there is nothing to plot. Adapters populate
        these to enable this view.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-sm ${l.cls}`} /> {l.label}
          </span>
        ))}
      </div>

      <div className={`overflow-x-auto ${panel}`}>
        <table className="text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 border-b border-edge bg-panel px-4 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[.07em] text-dim">
                Issue
              </th>
              {matrix.cols.map((c) => (
                <th key={`${c.org}/${c.repo}`} className="border-b border-edge px-1 pb-2 pt-3 align-bottom">
                  <div
                    className="mx-auto text-xs font-medium text-muted"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: "9rem" }}
                    title={`${c.org}/${c.repo}`}
                  >
                    {c.repo}
                    <span className="text-dim"> · {c.org}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {matrix.rows.map((row) => (
              <tr key={row.rowKey} className="hover:bg-panel2/70">
                <td className="sticky left-0 whitespace-nowrap bg-panel px-4 py-2 font-medium text-ink">
                  {row.rowLabel}
                </td>
                {matrix.cols.map((c) => (
                  <td key={`${c.org}/${c.repo}`} className="px-1 py-2 text-center">
                    <Cell item={matrix.cells.get(cellKey(row.rowKey, c.org, c.repo))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {matrix.unplottable.length > 0 && (
        <p className="text-xs text-dim">
          {matrix.unplottable.length} item(s) without units or an issueKey are not shown here — see the Repos tab.
        </p>
      )}
    </div>
  );
}
