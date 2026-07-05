import type { CampaignItem, ItemStatus, RepoRegistry } from "@devflo/schema";
import { buildMatrix, cellKey } from "../lib/matrix";

/**
 * Issue × repo matrix. Fully generic: rows come from `issueKey`, whatever the
 * adapter chose that to be. Cell colour is a pure function of ItemStatus.
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
  open: "bg-amber-400",
  pr: "bg-indigo-400",
  merged: "bg-green-500",
  skipped: "bg-slate-300",
  attention: "bg-red-500",
};

const LEGEND: { state: CellState | "none"; label: string; cls: string }[] = [
  { state: "open", label: "Open (pending / approved / in progress)", cls: STATE_STYLES.open },
  { state: "attention", label: "Needs attention / tests failed", cls: STATE_STYLES.attention },
  { state: "pr", label: "PR raised", cls: STATE_STYLES.pr },
  { state: "merged", label: "Merged", cls: STATE_STYLES.merged },
  { state: "skipped", label: "Skipped", cls: STATE_STYLES.skipped },
  { state: "none", label: "Not affected", cls: "bg-slate-100 border border-slate-200" },
];

function Cell({ item }: { item?: CampaignItem }) {
  if (!item) {
    return (
      <div
        className="mx-auto h-5 w-5 rounded-sm bg-slate-100 border border-slate-200"
        title="Not affected"
      />
    );
  }
  const state = STATUS_TO_STATE[item.status];
  const box = (
    <div
      className={`mx-auto h-5 w-5 rounded-sm ${STATE_STYLES[state]} ${item.prUrl ? "cursor-pointer hover:ring-2 hover:ring-blue-400" : ""}`}
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
      <p className="text-sm text-slate-500">
        No items in this campaign carry <code className="font-mono">units</code> or an{" "}
        <code className="font-mono">issueKey</code>, so there is nothing to plot. Adapters populate
        these to enable this view.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-sm ${l.cls}`} /> {l.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 border-b border-slate-200">
                Issue
              </th>
              {matrix.cols.map((c) => (
                <th
                  key={`${c.org}/${c.repo}`}
                  className="border-b border-slate-200 px-1 pb-2 pt-3 align-bottom"
                >
                  <div
                    className="mx-auto text-xs font-medium text-slate-600"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: "9rem" }}
                    title={`${c.org}/${c.repo}`}
                  >
                    {c.repo}
                    <span className="text-slate-400"> · {c.org}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matrix.rows.map((row) => (
              <tr key={row.rowKey} className="hover:bg-slate-50">
                <td className="sticky left-0 bg-white px-4 py-2 font-medium text-slate-800 whitespace-nowrap">
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
        <p className="text-xs text-slate-500">
          {matrix.unplottable.length} item(s) without units or an issueKey are not shown here — see the Repos tab.
        </p>
      )}
    </div>
  );
}
