import type { FixUnit } from "@devflo/schema";

/**
 * Renders an item's fix units (the contents of its single PR) as a table.
 * Columns are derived from the union of unit metadata keys IN DATA ORDER —
 * for npm-dependabot that yields package/fromVersion/toVersion/severity/
 * directDependency/advisory, but the component knows nothing about npm.
 */

function Value({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-slate-300">—</span>;
  }
  if (typeof value === "boolean") {
    return <span className={value ? "text-green-700" : "text-slate-500"}>{value ? "yes" : "no"}</span>;
  }
  if (typeof value === "string" && value.startsWith("http")) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
        {new URL(value).pathname.split("/").filter(Boolean).pop() ?? value}
      </a>
    );
  }
  if (typeof value === "object") {
    return <code className="text-xs bg-slate-100 rounded px-1">{JSON.stringify(value)}</code>;
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
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Fix</th>
            {hasCategory && <th className="px-3 py-2">Category</th>}
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-mono normal-case">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {units.map((unit) => (
            <tr key={unit.key}>
              <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                {unit.label ?? unit.key}
              </td>
              {hasCategory && (
                <td className="px-3 py-2">
                  {unit.category ? (
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 whitespace-nowrap">
                      {unit.category.replaceAll("_", " ")}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              )}
              {columns.map((c) => (
                <td key={c} className="px-3 py-2 text-slate-700 whitespace-nowrap">
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
