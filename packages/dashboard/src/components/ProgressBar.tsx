import type { Completion } from "@devflo/schema";

export function ProgressBar({ completion }: { completion: Completion }) {
  return (
    <div className="flex items-center gap-2 min-w-36">
      <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all"
          style={{ width: `${completion.pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-600 whitespace-nowrap">
        {completion.merged}/{completion.total} merged
      </span>
    </div>
  );
}
