import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import {
  attentionItems,
  completion,
  isItemOpen,
  pendingApprovalItems,
  type CampaignManifest,
  type RepoRegistry,
} from "@devflo/schema";
import { useCampaigns, useRepos } from "../api/hooks";
import { useRole } from "../context/role";
import { teamRepoKeys, visibleCampaigns, visibleItems } from "../lib/roles";
import { CampaignStatusBadge } from "../components/badges";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import { daysSince, timeAgo } from "../lib/format";

/** Role-aware headline stats — same data, different emphasis per role. */
function Stats({
  campaigns,
  registry,
}: {
  campaigns: CampaignManifest[];
  registry: RepoRegistry;
}) {
  const { role, team } = useRole();
  const teamRepos = teamRepoKeys(registry, team);
  const scoped = campaigns.map((c) => visibleItems(c, role, teamRepos)).flat();

  const pending = scoped.filter((i) => i.status === "PENDING_APPROVAL").length;
  const attention = scoped.filter((i) => ["TESTS_FAILED", "NEEDS_ATTENTION"].includes(i.status)).length;
  const active = campaigns.filter((c) => !["COMPLETED", "FAILED"].includes(c.status)).length;

  if (role === "stakeholder") {
    const merged = scoped.filter((i) => i.status === "MERGED").length;
    const open = scoped.filter(isItemOpen);
    const oldestOpen = Math.max(0, ...open.map((i) => daysSince(i.statusUpdatedAt)));
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Org-wide completion" value={`${scoped.length ? Math.round((merged / scoped.length) * 100) : 0}%`} sub={`${merged}/${scoped.length} repos merged`} tone="good" />
        <StatCard label="Open repos" value={open.length} tone={open.length ? "warn" : "good"} sub="not yet merged or skipped" />
        <StatCard label="Oldest open (days in state)" value={oldestOpen} tone={oldestOpen > 7 ? "danger" : "default"} />
        <StatCard label="Campaigns in flight" value={active} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label={role === "em" ? `Pending approvals (${team})` : "Awaiting your approval"}
        value={pending}
        tone={pending ? "warn" : "default"}
      />
      <StatCard label="Needs attention" value={attention} tone={attention ? "danger" : "default"} sub="test failures & blockers" />
      <StatCard label="Campaigns in flight" value={active} />
      <StatCard label="Your repos in scope" value={new Set(scoped.map((i) => `${i.org}/${i.repo}`)).size} sub={`team: ${team}`} />
    </div>
  );
}

export function CampaignList() {
  const { role, team } = useRole();
  const campaignsQ = useCampaigns();
  const reposQ = useRepos();

  if (campaignsQ.loading || reposQ.loading) return <p className="text-slate-500">Loading…</p>;
  if (campaignsQ.error || !campaignsQ.data || !reposQ.data)
    return <p className="text-red-600">Failed to load campaigns: {campaignsQ.error ?? reposQ.error}</p>;

  const registry = reposQ.data;
  const teamRepos = teamRepoKeys(registry, team);
  const campaigns = visibleCampaigns(campaignsQ.data.campaigns, role, teamRepos);
  const manifestErrors = campaignsQ.data.errors;

  return (
    <div className="space-y-5">
      {manifestErrors.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">
            {manifestErrors.length} manifest file{manifestErrors.length === 1 ? "" : "s"} failed schema validation and {manifestErrors.length === 1 ? "is" : "are"} hidden:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {manifestErrors.map((e) => (
              <li key={e.file}>
                <code className="font-mono text-xs">{e.file}</code> — {e.errors.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Stats campaigns={campaigns} registry={registry} />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Campaign</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Owner</th>
              <th className="px-4 py-2.5">Repos</th>
              <th className="px-4 py-2.5">Progress</th>
              <th className="px-4 py-2.5">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns.map((c) => {
              const scoped = visibleItems(c, role, teamRepos);
              const pending = pendingApprovalItems(c).filter((i) => scoped.includes(i)).length;
              const attention = attentionItems(c).filter((i) => scoped.includes(i)).length;
              return (
                <tr key={c.campaignId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/campaigns/${c.campaignId}`} className="font-medium text-blue-700 hover:underline">
                      {c.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <code className="rounded bg-slate-100 px-1 font-mono">{c.campaignType}</code>
                      {pending > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                          ● {pending} awaiting approval
                        </span>
                      )}
                      {attention > 0 && (
                        <span className="inline-flex items-center gap-1 font-medium text-red-700">
                          <AlertTriangle className="h-3 w-3" /> {attention} need attention
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><CampaignStatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-slate-700">{c.owner}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {new Set(scoped.map((i) => `${i.org}/${i.repo}`)).size}
                    {role !== "stakeholder" && scoped.length !== c.items.length && (
                      <span className="text-xs text-slate-400"> / {new Set(c.items.map((i) => `${i.org}/${i.repo}`)).size} total</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><ProgressBar completion={completion(c)} /></td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{timeAgo(c.updatedAt)}</td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No campaigns affect {role === "stakeholder" ? "any repos" : `${team}'s repos`} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
