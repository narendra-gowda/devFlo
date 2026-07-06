import type { Completion } from "@devflo/schema";

export function ProgressBar({ completion }: { completion: Completion }) {
  return (
    <div className="flex min-w-36 items-center gap-2.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#232530]">
        {/* Green = merged, matching the MERGED status colour everywhere else.
            Violet stays reserved for brand/interactive elements. */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2bbd85] to-ok shadow-[0_0_10px_rgba(63,221,157,.4)] transition-all"
          style={{ width: `${completion.pct}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-[11.5px] tabular-nums text-muted">
        {completion.merged}/{completion.total} merged
      </span>
    </div>
  );
}
