import type { CampaignItem, RepoRegistry } from "@devflo/schema";

/**
 * Generic issue × repo pivot.
 * - Items WITH units: one row per unit key (e.g. per package/finding); the
 *   cell shows the repo's PR status (one PR covers all units in that repo).
 * - Items WITHOUT units: rows come from the item-level `issueKey`.
 * The UI never interprets what a row "means" — adapters decide.
 */

export interface MatrixRow {
  rowKey: string;
  rowLabel: string;
}

export interface MatrixCol {
  org: string;
  repo: string;
}

export interface MatrixData {
  rows: MatrixRow[];
  cols: MatrixCol[];
  /** key: `${rowKey}|${org}/${repo}` */
  cells: Map<string, CampaignItem>;
  /** items with neither units nor issueKey can't be plotted; surfaced so they aren't silently hidden */
  unplottable: CampaignItem[];
}

export function cellKey(rowKey: string, org: string, repo: string): string {
  return `${rowKey}|${org}/${repo}`;
}

export function buildMatrix(items: CampaignItem[], registry: RepoRegistry): MatrixData {
  const rows = new Map<string, MatrixRow>();
  const cells = new Map<string, CampaignItem>();
  const unplottable: CampaignItem[] = [];

  const addCell = (rowKey: string, rowLabel: string, item: CampaignItem) => {
    if (!rows.has(rowKey)) rows.set(rowKey, { rowKey, rowLabel });
    cells.set(cellKey(rowKey, item.org, item.repo), item);
  };

  for (const item of items) {
    if (item.units?.length) {
      for (const unit of item.units) addCell(unit.key, unit.label ?? unit.key, item);
    } else if (item.issueKey) {
      addCell(item.issueKey, item.issueLabel ?? item.issueKey, item);
    } else {
      unplottable.push(item);
    }
  }

  // Columns: registry repos in the orgs this campaign touches ("not affected"
  // is only meaningful against a known population), plus any item repo the
  // registry doesn't know about yet.
  const orgs = new Set(items.map((i) => i.org));
  const cols = new Map<string, MatrixCol>();
  for (const r of registry.repos) {
    if (orgs.has(r.org)) cols.set(`${r.org}/${r.repo}`, { org: r.org, repo: r.repo });
  }
  for (const item of items) {
    cols.set(`${item.org}/${item.repo}`, { org: item.org, repo: item.repo });
  }

  return {
    rows: [...rows.values()].sort((a, b) => a.rowLabel.localeCompare(b.rowLabel)),
    cols: [...cols.values()].sort((a, b) => (a.org + a.repo).localeCompare(b.org + b.repo)),
    cells,
    unplottable,
  };
}
