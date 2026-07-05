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
import { pageTitle, panel, thBase, thCenter } from "../components/ui";

/**
 * Consolidated live view of GitHub Dependabot + code-scanning alerts.
 * This page is intentionally GitHub-specific (it renders GitHub's own
 * severity taxonomy) — unlike campaign views, which stay ecosystem-agnostic.
 */

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: "bg-critical/20 text-critical ring-1 ring-critical/50",
  high: "bg-high/15 text-high ring-1 ring-high/35",
  moderate: "bg-caution/15 text-caution ring-1 ring-caution/30",
  low: "bg-edge2/40 text-muted ring-1 ring-edge2",
};

const COUNT_STYLES: Record<AlertSeverity, string> = {
  critical: "font-bold text-critical",
  high: "font-semibold text-high",
  moderate: "font-semibold text-caution",
  low: "font-semibold text-muted",
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
        <div className="overflow-x-auto rounded-md border border-edge bg-panel">
          <table className="w-full text-sm">
            <thead className="border-b border-edge text-left text-[10.5px] font-semibold uppercase tracking-[.07em] text-dim">
              <tr>
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Affected version</th>
                <th className="px-3 py-2">Fix version</th>
                <th className="px-3 py-2">CVE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60">
              {repo.dependabot.map((a, i) => (
                <tr key={`${a.package}-${a.cveId ?? i}`}>
                  <td className="px-3 py-2 font-mono text-ink">{a.package}</td>
                  <td className="px-3 py-2"><SeverityBadge severity={a.severity} /></td>
                  <td className="px-3 py-2 font-mono text-xs text-ink/80">{a.affectedRange}</td>
                  <td className="px-3 py-2 font-mono text-xs text-ink/80">
                    {a.fixVersion ?? <span className="italic text-dim">no fix yet</span>}
                  </td>
                  <td className="px-3 py-2">
                    {a.url ? (
                      <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap text-accent2 hover:underline">
                        {a.cveId ?? "advisory"} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      a.cveId ?? <span className="text-dim">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {repo.codeScanning.length > 0 && (
        <div className="text-sm text-ink/85">
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[.07em] text-dim">Code scanning</p>
          <ul className="space-y-0.5">
            {repo.codeScanning.map((c, i) => (
              <li key={`${c.rule}-${i}`} className="flex items-center gap-2">
                <code className="rounded bg-panel2 px-1.5 font-mono text-xs text-accent2">{c.rule}</code>
                {c.severity && <span className="text-xs text-muted">{c.severity}</span>}
                {c.url && (
                  <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-accent2 hover:underline">
                    view <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {totalAlerts(repo) === 0 && <p className="text-sm text-dim">No open alerts.</p>}
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
  const clean = groupTotals.critical + groupTotals.high + groupTotals.moderate + groupTotals.low + groupCs === 0;

  return (
    <section>
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="font-mono text-sm font-semibold text-ink">{title}</h2>
        <span className="text-xs text-dim">
          {repos.length} repos ·
          {groupTotals.critical > 0 && <span className="ml-1 font-semibold text-critical">{groupTotals.critical} critical</span>}
          {groupTotals.high > 0 && <span className="ml-1 text-high">{groupTotals.high} high</span>}
          {groupTotals.moderate > 0 && <span className="ml-1 text-caution">{groupTotals.moderate} moderate</span>}
          {groupTotals.low > 0 && <span className="ml-1">{groupTotals.low} low</span>}
          {groupCs > 0 && <span className="ml-1 text-accent2">{groupCs} code scanning</span>}
          {clean && <span className="ml-1 text-ok">clean</span>}
        </span>
      </div>
      <div className={`overflow-x-auto ${panel}`}>
        <table className="w-full text-sm">
          <thead className="border-b border-edge">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className={thBase.replace("px-4", "px-2")}>Repo</th>
              {ALERT_SEVERITIES.map((s) => (
                <th key={s} className={thCenter}>{s}</th>
              ))}
              <th className={thCenter}>Code scanning</th>
              <th className={thCenter}>Total</th>
              <th className={thBase}>Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {repos.map((r) => {
              const key = `${r.org}/${r.repo}`;
              const counts = countBySeverity(r);
              const total = totalAlerts(r);
              const open = expanded.has(key);
              return (
                <Rows
                  key={key}
                  row={
                    <tr
                      className={`cursor-pointer hover:bg-panel2/70 ${counts.critical > 0 ? "border-l-4 border-l-critical bg-critical/[.05]" : ""}`}
                      onClick={() => toggle(key)}
                    >
                      <td className="px-2 py-2.5 text-dim">
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-2 py-2.5 font-semibold text-ink">{r.repo}</td>
                      {ALERT_SEVERITIES.map((s) => (
                        <td key={s} className="px-3 py-2.5 text-center tabular-nums">
                          {counts[s] > 0 ? (
                            <span className={COUNT_STYLES[s]}>{counts[s]}</span>
                          ) : (
                            <span className="text-edge2">·</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        {r.codeScanning.length > 0 ? (
                          <span className="font-semibold text-accent2">{r.codeScanning.length}</span>
                        ) : (
                          <span className="text-edge2">·</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        {total > 0 ? <span className="font-semibold text-ink">{total}</span> : <span className="text-ok">0</span>}
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={r.securityUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-accent2 hover:underline"
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
                        <td colSpan={8} className="bg-panel2/60 px-3 py-3">
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

function Rows({ row, detail }: { row: React.ReactNode; detail: React.ReactNode }) {
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

    const rank = (r: RepoAlerts) => {
      const c = countBySeverity(r);
      return c.critical * 1_000_000 + c.high * 10_000 + c.moderate * 100 + c.low + r.codeScanning.length * 100;
    };
    return [...byGroup.entries()]
      .map(([title, repos]) => ({ title, repos: repos.sort((a, b) => rank(b) - rank(a)) }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [alertsQ.data, reposQ.data, role, team, groupBy]);

  if (alertsQ.loading || reposQ.loading) return <p className="text-muted">Loading alerts…</p>;
  if (!alertsQ.data) return <p className="text-danger">Failed to load alerts: {alertsQ.error}</p>;

  const { source, fetchedAt } = alertsQ.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className={pageTitle}>Security alerts</h1>
        {source === "mock" ? (
          <span className="rounded-[5px] bg-warn/15 px-1.5 py-0.5 text-[11px] font-medium text-warn ring-1 ring-warn/25">
            mock data — set GITHUB_TOKEN on the server for live alerts
          </span>
        ) : (
          <span className="rounded-[5px] bg-ok/15 px-1.5 py-0.5 text-[11px] font-medium text-ok ring-1 ring-ok/25">live · GitHub</span>
        )}
        <span className="text-xs text-dim">
          Updated {new Date(fetchedAt).toLocaleTimeString()} · auto-refreshes every {ALERTS_REFRESH_MS / 1000}s
        </span>
        {alertsQ.error && <span className="text-xs text-danger">last refresh failed: {alertsQ.error}</span>}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex overflow-hidden rounded-[7px] border border-edge2 text-xs">
            {(["org", "team"] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`cursor-pointer px-2.5 py-1 ${
                  groupBy === g ? "bg-accent font-semibold text-[#0d0a1f]" : "bg-panel2 text-muted hover:text-ink"
                }`}
              >
                By {g === "org" ? "organisation" : "team"}
              </button>
            ))}
          </div>
          <button
            onClick={alertsQ.refresh}
            disabled={alertsQ.refreshing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-edge2 bg-panel2 px-2.5 py-1 text-xs font-medium text-muted hover:text-ink disabled:opacity-50"
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
        <p className="py-8 text-center text-dim">
          No repos in scope{role !== "stakeholder" ? ` for ${team}` : ""}.
        </p>
      )}
    </div>
  );
}
