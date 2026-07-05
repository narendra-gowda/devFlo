import type { FixUnit } from "@devflo/schema";

/**
 * Renders an item's fix units (the contents of its single PR) as a table.
 * Columns are derived from the union of unit metadata keys IN DATA ORDER —
 * for npm-dependabot that yields package/fromVersion/toVersion/severity/
 * directDependency/advisory, but the component knows nothing about npm.
 */

function Value({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-dim">—</span>;
  }
  if (typeof value === "boolean") {
    return <span className={value ? "text-ok" : "text-muted"}>{value ? "yes" : "no"}</span>;
  }
  if (typeof value === "string" && value.startsWith("http")) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="text-accent2 hover:underline">
        {new URL(value).pathname.split("/").filter(Boolean).pop() ?? value}
      </a>
    );
  }
  if (typeof value === "object") {
    return <code className="rounded bg-panel2 px-1 text-xs">{JSON.stringify(value)}</code>;
  }
  return <>{String(value)}</>;
}

export function UnitsTable({ units }: { units: FixUnit[] }) {
  const columns: string[] = [];
  for (const unit of units) {
    for (const key of Object.keys(unit.metadata)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  const hasCategory = units.some((u) => u.category);

  return (
    <div className="overflow-x-auto rounded-md border border-edge bg-panel">
      <table className="w-full text-sm">
        <thead className="border-b border-edge text-left text-[10.5px] font-semibold uppercase tracking-[.07em] text-dim">
          <tr>
            <th className="px-3 py-2">Fix</th>
            {hasCategory && <th className="px-3 py-2">Category</th>}
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-mono normal-case">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edge/60">
          {units.map((unit) => (
            <tr key={unit.key}>
              <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">
                {unit.label ?? unit.key}
              </td>
              {hasCategory && (
                <td className="px-3 py-2">
                  {unit.category ? (
                    <span className="inline-flex whitespace-nowrap rounded-full bg-panel2 px-2 py-0.5 text-xs font-medium text-muted ring-1 ring-edge2">
                      {unit.category.replaceAll("_", " ")}
                    </span>
                  ) : (
                    <span className="text-dim">—</span>
                  )}
                </td>
              )}
              {columns.map((c) => (
                <td key={c} className="whitespace-nowrap px-3 py-2 text-ink/85">
                  <Value value={unit.metadata[c]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
