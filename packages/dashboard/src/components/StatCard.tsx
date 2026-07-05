const GLOWS: Record<string, string | undefined> = {
  warn: "0 0 24px rgba(245,177,83,.35)",
  danger: "0 0 24px rgba(241,106,106,.35)",
  good: "0 0 24px rgba(63,221,157,.3)",
};

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const valueColor = {
    default: "text-ink",
    warn: "text-warn",
    danger: "text-danger",
    good: "text-ok",
  }[tone];
  return (
    <div className="rounded-[10px] border border-edge bg-gradient-to-b from-panel2 to-panel px-4 py-3.5">
      <p className="text-[11.5px] font-medium text-muted">{label}</p>
      <p
        className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${valueColor}`}
        style={{ textShadow: GLOWS[tone] }}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11.5px] text-dim">{sub}</p>}
    </div>
  );
}
