import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import {
  ATTENTION_STATUSES,
  type CampaignItem,
  type CampaignManifest,
  type ItemStatus,
} from "@devflo/schema";
import { useCampaigns, useRepos } from "../api/hooks";
import { useRole } from "../context/role";
import { teamRepoKeys, visibleItems } from "../lib/roles";
import { ItemStatusBadge } from "../components/badges";
import { pageTitle, panel, thBase, thCenter } from "../components/ui";
import { daysSince, fmtDate } from "../lib/format";

/**
 * Queues are pure filtered views over the same manifests — no separate data.
 * One component serves all three sidebar queues.
 */

export type QueueType = "approvals" | "attention" | "completed";

const QUEUE_CONFIG: Record<QueueType, { title: string; sub: string; statuses: ItemStatus[] }> = {
  approvals: {
    title: "Awaiting approval",
    sub: "Items blocked on the human gate — nothing executes until these are signed off.",
    statuses: ["PENDING_APPROVAL"],
  },
  attention: {
    title: "Needs attention",
    sub: "Test failures and blockers that require a human to unblock.",
    statuses: ATTENTION_STATUSES,
  },
  completed: {
    title: "Completed",
    sub: "Merged items across all campaigns.",
    statuses: ["MERGED"],
  },
};

interface QueueRow {
  campaign: CampaignManifest;
  item: CampaignItem;
}

export function QueuePage({ type }: { type: QueueType }) {
  const { role, team } = useRole();
  const campaignsQ = useCampaigns();
  const reposQ = useRepos();
  const cfg = QUEUE_CONFIG[type];

  if (campaignsQ.loading || reposQ.loading) return <p className="text-muted">Loading…</p>;
  if (!campaignsQ.data || !reposQ.data)
    return <p className="text-danger">Failed to load: {campaignsQ.error ?? reposQ.error}</p>;

  const teamRepos = teamRepoKeys(reposQ.data, team);
  const rows: QueueRow[] = campaignsQ.data.campaigns
    .flatMap((campaign) =>
      visibleItems(campaign, role, teamRepos)
        .filter((item) => cfg.statuses.includes(item.status))
        .map((item) => ({ campaign, item }))
    )
    // oldest-in-state first for work queues; newest first for completed
    .sort((a, b) =>
      type === "completed"
        ? b.item.statusUpdatedAt.localeCompare(a.item.statusUpdatedAt)
        : a.item.statusUpdatedAt.localeCompare(b.item.statusUpdatedAt)
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className={pageTitle}>
          {cfg.title} <span className="ml-1 text-muted">({rows.length})</span>
        </h1>
        <p className="mt-1 text-sm text-muted">{cfg.sub}</p>
      </div>

      <div className={`overflow-x-auto ${panel}`}>
        <table className="w-full text-sm">
          <thead className="border-b border-edge">
            <tr>
              <th className={thBase}>Repo</th>
              <th className={thBase}>Change</th>
              <th className={thBase}>Campaign</th>
              <th className={thCenter}>Status</th>
              <th className={thCenter} title="Days in current status">Age</th>
              <th className={thCenter}>Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {rows.map(({ campaign, item }) => {
              const stale = type !== "completed" && daysSince(item.statusUpdatedAt) > 7;
              return (
                <tr key={item.itemId} className="hover:bg-hover">
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-ink">{item.repo}</span>
                    <span className="block text-xs text-dim">{item.org}</span>
                  </td>
                  <td className="max-w-md px-4 py-2.5 text-ink/85">{item.description}</td>
                  <td className="px-4 py-2.5">
                    <Link to={`/campaigns/${campaign.campaignId}`} className="text-accent2 hover:underline">
                      {campaign.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-center"><ItemStatusBadge status={item.status} /></td>
                  <td
                    className={`whitespace-nowrap px-4 py-2.5 text-center text-xs tabular-nums ${stale ? "font-semibold text-danger" : "text-dim"}`}
                    title={`Since ${fmtDate(item.statusUpdatedAt)}`}
                  >
                    {daysSince(item.statusUpdatedAt)}d{stale ? " ⚠" : ""}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex justify-center gap-3 text-xs">
                      {item.prUrl && (
                        <a href={item.prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-accent2 hover:underline">
                          PR <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {item.adoTicketUrl && (
                        <a href={item.adoTicketUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-accent2 hover:underline">
                          ADO <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dim">
                  Queue is empty{role !== "stakeholder" ? ` for ${team}` : ""}. 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
