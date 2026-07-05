/**
 * Renders CampaignItem.metadata as opaque key/values. This is the ONLY way
 * ecosystem-specific data reaches the screen — the dashboard never interprets
 * keys, so new adapters need no UI changes.
 */
export function MetadataTable({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) {
    return <p className="text-sm italic text-dim">No adapter metadata</p>;
  }
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="pt-0.5 font-mono text-xs text-dim">{key}</dt>
          <dd className="break-all text-ink/90">
            {typeof value === "string" && value.startsWith("http") ? (
              <a href={value} target="_blank" rel="noreferrer" className="text-accent2 hover:underline">
                {value}
              </a>
            ) : typeof value === "object" ? (
              <code className="rounded bg-panel2 px-1 py-0.5 text-xs">{JSON.stringify(value)}</code>
            ) : (
              String(value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
