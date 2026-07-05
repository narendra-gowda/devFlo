import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import {
  ALERT_SEVERITIES,
  type AlertSeverity,
  type RepoAlerts,
  type RepoRegistry,
} from "@devflo/schema";
import { useAlerts, useRepos, ALERTS_REFRESH_MS } from "../api/hooks";
import { useRole } from "../context/role";
import { teamRepoKeys } from "../lib/roles";

/**
 * Consolidated live view of GitHub Dependabot + code-scanning alerts.
 * This page is intentionally GitHub-specific (it renders GitHub's own
 * severity taxonomy) — unlike campaign views, which stay ecosystem-agnostic.
 *
 * Grouping: some apps share an org, some have their own. repos.json maps
 * every repo to BOTH an org and a team, so the view offers both groupings.
 */

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-100 text-orange-800 ring-1 ring-orange-300",
  moderate: "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300",
  low: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  );
}

function countBySeverity(r: RepoAlerts): Record<AlertSeverity, number> {
  const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
  for (const a of r.dependabot) counts[a.severity]++;
  return counts;
}

function totalAlerts(r: RepoAlerts): number {
  return r.dependabot.length + r.codeScanning.length;
}

function AlertDetail({ repo }: { repo: RepoAlerts }) {
  return (
    <div className="space-y-3">
      {repo.dependabot.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Affected version</th>
                <th className="px-3 py-2">Fix version</th>
                <th className="px-3 py-2">CVE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {repo.dependabot.map((a, i) => (
                <tr key={`${a.package}-${a.cveId ?? i}`}>
                  <td className="px-3 py-2 font-mono text-slate-800">{a.package}</td>
                  <td className="px-3 py-2"><SeverityBadge severity={a.severity} /></td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{a.affectedRange}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">
                    {a.fixVersion ?? <span className="text-slate-400 italic">no fix yet</span>}
                  </td>
                  <td className="px-3 py-2">
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline whitespace-nowrap">
                        {a.cveId ?? "advisory"} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      a.cveId ?? <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {repo.codeScanning.length > 0 && (
        <div className="text-sm text-slate-700">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Code scanning</p>
          <ul className="space-y-0.5">
            {repo.codeScanning.map((c, i) => (
              <li key={`${c.rule}-${i}`} className="flex items-center gap-2">
                <code className="rounded bg-slate-100 px-1 font-mono text-xs">{c.rule}</code>
                {c.severity && <span className="text-xs text-slate-500">{c.severity}</span>}
                {c.url && (
                  <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline">
                    view <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {totalAlerts(repo) === 0 && <p className="text-sm text-slate-400">No open alerts.</p>}
    </div>
  );
}

function GroupSection({ title, repos }: { title: string; repos: RepoAlerts[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) => {
    const next = new Set(expanded);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpanded(next);
  };

  const groupTotals = { critical: 0, high: 0, moderate: 0, low: 0 };
  let groupCs = 0;
  for (const r of repos) {
    const c = countBySeverity(r);
    for (const s of ALERT_SEVERITIES) groupTotals[s] += c[s];
    groupCs += r.codeScanning.length;
  }

  return (
    <section>
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="font-mono text-sm font-semibold text-slate-800">{title}</h2>
        <span className="text-xs text-slate-500">
          {repos.length} repos ·
          {groupTotals.critical > 0 && <span className="ml-1 font-semibold text-red-600">{groupTotals.critical} critical</span>}
          {groupTotals.high > 0 && <span className="ml-1 text-orange-600">{groupTotals.high} high</span>}
          {groupTotals.moderate > 0 && <span className="ml-1 text-yellow-600">{groupTotals.moderate} moderate</span>}
          {groupTotals.low > 0 && <span className="ml-1">{groupTotals.low} low</span>}
          {groupCs > 0 && <span className="ml-1 text-purple-600">{groupCs} code scanning</span>}
          {groupTotals.critical + groupTotals.high + groupTotals.moderate + groupTotals.low + groupCs === 0 && (
            <span className="ml-1 text-green-600">clean</span>
          )}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-8 px-2 py-2.5" />
              <th className="px-2 py-2.5">Repo</th>
              {ALERT_SEVERITIES.map((s) => (
                <th key={s} className="px-3 py-2.5 text-center">{s}</th>
              ))}
              <th className="px-3 py-2.5 text-center">Code scanning</th>
              <th className="px-3 py-2.5 text-center">Total</th>
              <th className="px-3 py-2.5">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {repos.map((r) => {
              const key = `${r.org}/${r.repo}`;
              const counts = countBySeverity(r);
              const total = totalAlerts(r);
              const open = expanded.has(key);
              return (
                <RowPair
                  key={key}
                  row={
                    <tr
                      className={`cursor-pointer hover:bg-slate-50 ${counts.critical > 0 ? "border-l-4 border-l-red-500 bg-red-50/40" : ""}`}
                      onClick={() => toggle(key)}
                    >
                      <td className="px-2 py-2.5 text-slate-400">
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-2 py-2.5 font-medium text-slate-800">{r.repo}</td>
                      {ALERT_SEVERITIES.map((s) => (
                        <td key={s} className="px-3 py-2.5 text-center tabular-nums">
                          {counts[s] > 0 ? (
                            <span className={s === "critical" ? "font-bold text-red-600" : "font-semibold text-slate-800"}>
                              {counts[s]}
                            </span>
                          ) : (
                            <span className="text-slate-300">·</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        {r.codeScanning.length > 0 ? (
                          <span className="font-semibold text-purple-700">{r.codeScanning.length}</span>
                        ) : (
                          <span className="text-slate-300">·</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        {total > 0 ? <span className="font-semibold">{total}</span> : <span className="text-green-600">0</span>}
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={r.securityUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline whitespace-nowrap"
                        >
                          Security <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  }
                  detail={
                    open ? (
                      <tr>
                        <td />
                        <td colSpan={8} className="bg-slate-50 px-3 py-3">
                          <AlertDetail repo={r} />
                        </td>
                      </tr>
                    ) : null
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RowPair({ row, detail }: { row: React.ReactNode; detail: React.ReactNode }) {
  return (
    <>
      {row}
      {detail}
    </>
  );
}

type GroupBy = "org" | "team";

export function SecurityAlerts() {
  const { role, team } = useRole();
  const alertsQ = useAlerts();
  const reposQ = useRepos();
  const [groupBy, setGroupBy] = useState<GroupBy>("org");

  const groups = useMemo(() => {
    if (!alertsQ.data || !reposQ.data) return [];
    const registry: RepoRegistry = reposQ.data;
    const scope = role === "stakeholder" ? null : teamRepoKeys(registry, team);
    const teamOf = new Map(registry.repos.map((r) => [`${r.org}/${r.repo}`, r.team]));

    const inScope = alertsQ.data.repos.filter(
      (r) => !scope || scope.has(`${r.org}/${r.repo}`)
    );

    const byGroup = new Map<string, RepoAlerts[]>();
    for (const r of inScope) {
      const key = groupBy === "org" ? r.org : teamOf.get(`${r.org}/${r.repo}`) ?? "unmapped";
      byGroup.set(key, [...(byGroup.get(key) ?? []), r]);
    }

    // Within each group: worst first (criticals, then total), clean repos last.
    const rank = (r: RepoAlerts) => {
      const c = countBySeverity(r);
      return c.critical * 1_000_000 + c.high * 10_000 + c.moderate * 100 + c.low + r.codeScanning.length * 100;
    };
    return [...byGroup.entries()]
      .map(([title, repos]) => ({ title, repos: repos.sort((a, b) => rank(b) - rank(a)) }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [alertsQ.data, reposQ.data, role, team, groupBy]);

  if (alertsQ.loading || reposQ.loading) return <p className="text-slate-500">Loading alerts…</p>;
  if (!alertsQ.data)
    return <p className="text-red-600">Failed to load alerts: {alertsQ.error}</p>;

  const { source, fetchedAt } = alertsQ.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Security alerts</h1>
        <span className="text-xs text-slate-500">
          {source === "mock" ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
              mock data — set GITHUB_TOKEN on the server for live alerts
            </span>
          ) : (
            <span className="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-800">live · GitHub</span>
          )}
        </span>
        <span className="text-xs text-slate-500">
          Updated {new Date(fetchedAt).toLocaleTimeString()} · auto-refreshes every {ALERTS_REFRESH_MS / 1000}s
        </span>
        {alertsQ.error && <span className="text-xs text-red-600">last refresh failed: {alertsQ.error}</span>}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex rounded-md border border-slate-300 text-xs">
            {(["org", "team"] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-2.5 py-1 first:rounded-l-md last:rounded-r-md ${
                  groupBy === g ? "bg-slate-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                By {g === "org" ? "organisation" : "team"}
              </button>
            ))}
          </div>
          <button
            onClick={alertsQ.refresh}
            disabled={alertsQ.refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${alertsQ.refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {groups.map((g) => (
        <GroupSection key={g.title} title={g.title} repos={g.repos} />
      ))}
      {groups.length === 0 && (
        <p className="py-8 text-center text-slate-400">
          No repos in scope{role !== "stakeholder" ? ` for ${team}` : ""}.
        </p>
      )}
    </div>
  );
}
