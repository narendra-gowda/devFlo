/**
 * Renders CampaignItem.metadata as opaque key/values. This is the ONLY way
 * ecosystem-specific data reaches the screen — the dashboard never interprets
 * keys, so new adapters need no UI changes.
 */
export function MetadataTable({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400 italic">No adapter metadata</p>;
  }
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-mono text-xs text-slate-500 pt-0.5">{key}</dt>
          <dd className="text-slate-800 break-all">
            {typeof value === "string" && value.startsWith("http") ? (
              <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {value}
              </a>
            ) : typeof value === "object" ? (
              <code className="text-xs bg-slate-100 rounded px-1 py-0.5">{JSON.stringify(value)}</code>
            ) : (
              String(value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
