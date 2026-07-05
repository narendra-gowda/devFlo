import type { FixUnit } from "@devflo/schema";
import { matchSeverityTone } from "../lib/severity";

/**
 * Renders an item's fix units (the contents of its single PR) as a table.
 * Columns are derived from the union of unit metadata keys IN DATA ORDER —
 * for npm-dependabot that yields package/fromVersion/toVersion/severity/
 * directDependency/advisory, but the component knows nothing about npm.
 *
 * Layout is `table-fixed` with a locked first-column width so that when
 * several accordions are open, the columns line up from row to row instead
 * of each table sizing itself to its own content. Long values truncate with
 * a tooltip.
 */

/** Locked width of the "Fix" column — keeps open accordions aligned. */
const FIX_COL_WIDTH = "w-64";

function Value({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-dim">—</span>;
  }
  if (typeof value === "boolean") {
    return <span className={value ? "text-ok" : "text-muted"}>{value ? "yes" : "no"}</span>;
  }
  if (typeof value === "string") {
    if (value.startsWith("http")) {
      return (
        <a href={value} target="_blank" rel="noreferrer" className="text-accent2 hover:underline">
          {new URL(value).pathname.split("/").filter(Boolean).pop() ?? value}
        </a>
      );
    }
    const tone = matchSeverityTone(value);
    if (tone) {
      return (
        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tone.pill}`}>
          {value.toLowerCase()}
        </span>
      );
    }
  }
  if (typeof value === "object") {
    return <code className="rounded bg-panel2 px-1 text-xs">{JSON.stringify(value)}</code>;
  }
  return <>{String(value)}</>;
}

/** Column cells are centred when every non-empty value in them is a recognised severity. */
function isSeverityColumn(units: FixUnit[], column: string): boolean {
  const values = units.map((u) => u.metadata[column]).filter((v) => v !== undefined && v !== null && v !== "");
  return values.length > 0 && values.every((v) => typeof v === "string" && matchSeverityTone(v));
}

export function UnitsTable({ units }: { units: FixUnit[] }) {
  const columns: string[] = [];
  for (const unit of units) {
    for (const key of Object.keys(unit.metadata)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  const centered = new Set(columns.filter((c) => isSeverityColumn(units, c)));

  return (
    <div className="overflow-x-auto rounded-md border border-edge bg-panel">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b border-edge text-left text-[10.5px] font-semibold uppercase tracking-[.07em] text-dim">
          <tr>
            <th className={`${FIX_COL_WIDTH} px-3 py-2`}>Fix</th>
            {columns.map((c) => (
              <th key={c} className={`truncate px-3 py-2 font-mono normal-case ${centered.has(c) ? "text-center" : ""}`} title={c}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edge/60">
          {units.map((unit) => (
            <tr key={unit.key}>
              <td className="truncate px-3 py-2 font-medium text-ink" title={unit.label ?? unit.key}>
                {unit.label ?? unit.key}
              </td>
              {columns.map((c) => {
                const raw = unit.metadata[c];
                return (
                  <td
                    key={c}
                    className={`truncate px-3 py-2 text-ink/85 ${centered.has(c) ? "text-center" : ""}`}
                    title={typeof raw === "string" || typeof raw === "number" ? String(raw) : undefined}
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
