import type { FixUnit } from "@devflo/schema";
import { matchSeverityTone } from "../lib/severity";

/**
 * Renders an item's fix units (the contents of its single PR) as a table.
 * Columns are derived from the union of unit metadata keys IN DATA ORDER —
 * for npm-dependabot that yields package/fromVersion/toVersion/severity/
 * directDependency/advisory, but the component knows nothing about npm.
 *
 * Layout is `table-fixed` with a locked first column and coarse width
 * buckets for short columns (versions, severities, booleans), so open
 * accordions stay aligned without huge gaps between narrow columns. The
 * widest bucket (long text / links) has no fixed width and absorbs the
 * remaining space. Long values truncate with a tooltip.
 */

/** Locked width of the "Fix" column — keeps open accordions aligned. */
const FIX_COL_WIDTH = "w-100";

function displayLength(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1;
  if (typeof value === "boolean") return 3;
  if (typeof value === "string") {
    if (value.startsWith("http")) {
      const segment = value.split("/").filter(Boolean).pop() ?? value;
      return Math.min(segment.length, 24);
    }
    return value.length;
  }
  return Math.min(JSON.stringify(value).length, 40);
}

/**
 * Coarse, deterministic width buckets: similar content lands in the same
 * bucket across accordions, so columns line up without content-sized gaps.
 */
function columnMax(units: FixUnit[], column: string): number {
  return Math.max(
    column.length,
    ...units.map((u) => displayLength(u.metadata[column])),
  );
}

function widthClassFor(max: number): string | undefined {
  if (max <= 8) return "w-28"; // severities, booleans, tiny versions
  if (max <= 12) return "w-34"; // version strings
  if (max <= 16) return "w-40"; // longer versions, short ids
  if (max <= 24) return "w-48"; // ranges, medium ids
  return undefined; // long text / links — absorbs remaining space
}

/**
 * Width per column, with a guarantee that at least ONE column stays
 * flexible: with `table-fixed` + w-full, if every column had a fixed width
 * the browser would stretch them all proportionally to fill the container —
 * which is exactly the "wide gaps between short columns" effect. The widest
 * column gives up its fixed width and absorbs the slack instead.
 */
function columnWidths(
  units: FixUnit[],
  columns: string[],
): Map<string, string | undefined> {
  const maxes = new Map(columns.map((c) => [c, columnMax(units, c)]));
  const widths = new Map(columns.map((c) => [c, widthClassFor(maxes.get(c)!)]));
  if (
    columns.length > 0 &&
    [...widths.values()].every((w) => w !== undefined)
  ) {
    const widest = columns.reduce((a, b) =>
      maxes.get(b)! > maxes.get(a)! ? b : a,
    );
    widths.set(widest, undefined);
  }
  return widths;
}

function Value({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-dim">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-ok" : "text-muted"}>
        {value ? "yes" : "no"}
      </span>
    );
  }
  if (typeof value === "string") {
    if (value.startsWith("http")) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-accent2 hover:underline"
        >
          {new URL(value).pathname.split("/").filter(Boolean).pop() ?? value}
        </a>
      );
    }
    const tone = matchSeverityTone(value);
    if (tone) {
      return (
        <span
          className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tone.pill}`}
        >
          {value.toLowerCase()}
        </span>
      );
    }
  }
  if (typeof value === "object") {
    return (
      <code className="rounded bg-panel2 px-1 text-xs">
        {JSON.stringify(value)}
      </code>
    );
  }
  return <>{String(value)}</>;
}

/** Column cells are centred when every non-empty value in them is a recognised severity. */
function isSeverityColumn(units: FixUnit[], column: string): boolean {
  const values = units
    .map((u) => u.metadata[column])
    .filter((v) => v !== undefined && v !== null && v !== "");
  return (
    values.length > 0 &&
    values.every((v) => typeof v === "string" && matchSeverityTone(v))
  );
}

export function UnitsTable({ units }: { units: FixUnit[] }) {
  const columns: string[] = [];
  for (const unit of units) {
    for (const key of Object.keys(unit.metadata)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  const centered = new Set(columns.filter((c) => isSeverityColumn(units, c)));
  const widths = columnWidths(units, columns);

  return (
    <div className="overflow-x-auto rounded-md border border-edge bg-panel">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b border-edge text-left text-[10.5px] font-semibold uppercase tracking-[.07em] text-dim">
          <tr>
            <th className={`${FIX_COL_WIDTH} px-3 py-2`}>Fix</th>
            {columns.map((c) => (
              <th
                key={c}
                className={`truncate px-3 py-2 font-mono normal-case ${widths.get(c) ?? ""} ${centered.has(c) ? "text-center" : ""}`}
                title={c}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edge/60">
          {units.map((unit) => (
            <tr key={unit.key}>
              <td
                className="truncate px-3 py-2 font-medium text-ink"
                title={unit.label ?? unit.key}
              >
                {unit.label ?? unit.key}
              </td>
              {columns.map((c) => {
                const raw = unit.metadata[c];
                return (
                  <td
                    key={c}
                    className={`truncate px-3 py-2 text-ink/85 ${centered.has(c) ? "text-center" : ""}`}
                    title={
                      typeof raw === "string" || typeof raw === "number"
                        ? String(raw)
                        : undefined
                    }
                  >
                    <Value value={raw} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
