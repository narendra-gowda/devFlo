import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import {
  ATTENTION_STATUSES,
  campaignUnitCategories,
  completion,
  hasUnits,
  isItemOpen,
  pendingApprovalItems,
  unitCounts,
  type CampaignItem,
  type CampaignManifest,
} from "@devflo/schema";
import { useCampaign, useRepos } from "../api/hooks";
import { useRole } from "../context/role";
import { teamRepoKeys, visibleItems } from "../lib/roles";
import { CampaignStatusBadge, ItemStatusBadge, StrategyBadge } from "../components/badges";
import { ProgressBar } from "../components/ProgressBar";
import { ApprovalBanner } from "../components/ApprovalBanner";
import { MetadataTable } from "../components/MetadataTable";
import { UnitsTable } from "../components/UnitsTable";
import { MatrixView } from "./MatrixView";
import { daysSince, fmtDate } from "../lib/format";

/** Sort: problems first, then approvals, then active work, then done. */
function itemSortKey(item: CampaignItem): number {
  if (ATTENTION_STATUSES.includes(item.status)) return 0;
  if (item.status === "PENDING_APPROVAL") return 1;
  if (item.status === "APPROVED" || item.status === "IN_PROGRESS") return 2;
  if (item.status === "PR_RAISED") return 3;
  return 4;
}

function AgeChip({ item }: { item: CampaignItem }) {
  const days = daysSince(item.statusUpdatedAt);
  const stale = isItemOpen(item) && days > 7;
  return (
    <span
      className={`text-xs tabular-nums whitespace-nowrap ${stale ? "font-semibold text-red-600" : "text-slate-500"}`}
      title={`In this status since ${fmtDate(item.statusUpdatedAt)}`}
    >
      {days}d{stale ? " ⚠" : ""}
    </span>
  );
}

function LinkCell({ item }: { item: CampaignItem }) {
  return (
    <div className="flex gap-3 text-xs">
      {item.prUrl ? (
        <a href={item.prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
          PR <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-slate-300">PR</span>
      )}
      {item.adoTicketUrl ? (
        <a href={item.adoTicketUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
          ADO <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-slate-300">ADO</span>
      )}
    </div>
  );
}

function ExpandedDetail({ campaign, item, colSpan }: { campaign: CampaignManifest; item: CampaignItem; colSpan: number }) {
  const attention = ATTENTION_STATUSES.includes(item.status);
  return (
    <tr className={attention ? "border-l-4 border-l-red-500" : ""}>
      <td />
      <td colSpan={colSpan} className="bg-slate-50 px-3 py-3 space-y-3">
        <p className="text-sm text-slate-700">{item.description}</p>
        {item.units && item.units.length > 0 && <UnitsTable units={item.units} />}
        {Object.keys(item.metadata).length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Adapter metadata ({campaign.campaignType})
            </p>
            <MetadataTable metadata={item.metadata} />
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * Table layout for campaigns whose items carry fix units (e.g. security
 * campaigns): one row per repo (= one PR), with per-category counts.
 * Columns come from the manifest's unitCategories — nothing hardcoded.
 */
function UnitCountsTable({ campaign, items }: { campaign: CampaignManifest; items: CampaignItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const categories = campaignUnitCategories(campaign);
  const colSpan = categories.length + 4;

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-8 px-2 py-2.5" />
            <th className="px-2 py-2.5">Repo</th>
            {categories.map((c) => (
              <th key={c} className="px-3 py-2.5 text-center">{c.replaceAll("_", " ")}</th>
            ))}
            <th className="px-3 py-2.5 text-center">Total</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5" title="Days in current status">Age</th>
            <th className="px-3 py-2.5">Links</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const { byCategory, total } = unitCounts(item);
            const attention = ATTENTION_STATUSES.includes(item.status);
            const open = expanded.has(item.itemId);
            return (
              <UnitRow
                key={item.itemId}
                open={open}
                onToggle={() => toggle(item.itemId)}
                row={
                  <tr
                    className={`cursor-pointer hover:bg-slate-50 ${attention ? "border-l-4 border-l-red-500 bg-red-50/60" : ""}`}
                    onClick={() => toggle(item.itemId)}
                  >
                    <td className="px-2 py-2.5 text-slate-400">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="font-medium text-slate-800">
                        {attention && <AlertTriangle className="mr-1 inline h-4 w-4 text-red-600" />}
                        {item.repo}
                      </span>
                      <span className="block text-xs text-slate-500">{item.org}</span>
                    </td>
                    {categories.map((c) => {
                      const n = byCategory[c] ?? 0;
                      return (
                        <td key={c} className="px-3 py-2.5 text-center tabular-nums">
                          {n > 0 ? <span className="font-semibold text-slate-800">{n}</span> : <span className="text-slate-300">·</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-slate-800">{total}</td>
                    <td className="px-3 py-2.5"><ItemStatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5"><AgeChip item={item} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <LinkCell item={item} />
                    </td>
                  </tr>
                }
                detail={open ? <ExpandedDetail campaign={campaign} item={item} colSpan={colSpan} /> : null}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Helper to render a row + optional detail row without extra DOM nesting. */
function UnitRow({ row, detail }: { open: boolean; onToggle: () => void; row: React.ReactNode; detail: React.ReactNode }) {
  return (
    <>
      {row}
      {detail}
    </>
  );
}

/** Default layout for campaigns without fix units. */
function PlainItemsTable({ campaign, items }: { campaign: CampaignManifest; items: CampaignItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-8 px-2 py-2.5" />
            <th className="px-2 py-2.5">Repo</th>
            <th className="px-3 py-2.5">Change</th>
            <th className="px-3 py-2.5">Strategy</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5" title="Days in current status">Age</th>
            <th className="px-3 py-2.5">Links</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const attention = ATTENTION_STATUSES.includes(item.status);
            const open = expanded.has(item.itemId);
            return (
              <UnitRow
                key={item.itemId}
                open={open}
                onToggle={() => toggle(item.itemId)}
                row={
                  <tr
                    className={`cursor-pointer hover:bg-slate-50 ${attention ? "border-l-4 border-l-red-500 bg-red-50/60" : ""}`}
                    onClick={() => toggle(item.itemId)}
                  >
                    <td className="px-2 py-2.5 text-slate-400">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="font-medium text-slate-800">{item.repo}</span>
                      <span className="block text-xs text-slate-500">{item.org}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {attention && <AlertTriangle className="mr-1 inline h-4 w-4 text-red-600" />}
                      {item.description}
                    </td>
                    <td className="px-3 py-2.5"><StrategyBadge strategy={item.strategy} /></td>
                    <td className="px-3 py-2.5"><ItemStatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5"><AgeChip item={item} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <LinkCell item={item} />
                    </td>
                  </tr>
                }
                detail={open ? <ExpandedDetail campaign={campaign} item={item} colSpan={6} /> : null}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CampaignDetail() {
  const { id } = useParams();
  const { role, team } = useRole();
  const campaignQ = useCampaign(id);
  const reposQ = useRepos();
  const [tab, setTab] = useState<"items" | "matrix">("items");

  const campaign = campaignQ.data;
  const items = useMemo(() => {
    if (!campaign || !reposQ.data) return [];
    const scoped = visibleItems(campaign, role, teamRepoKeys(reposQ.data, team));
    return [...scoped].sort((a, b) => itemSortKey(a) - itemSortKey(b));
  }, [campaign, reposQ.data, role, team]);

  if (campaignQ.loading || reposQ.loading) return <p className="text-slate-500">Loading…</p>;
  if (campaignQ.error || !campaign || !reposQ.data)
    return (
      <div>
        <p className="text-red-600">Campaign not found: {campaignQ.error}</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">← Back to campaigns</Link>
      </div>
    );

  const pendingInScope = items.filter((i) => i.status === "PENDING_APPROVAL").length;
  const unitsLayout = hasUnits(campaign);
  const hasMatrix = campaign.items.some((i) => i.issueKey || i.units?.length);

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← All campaigns</Link>

      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-900">{campaign.title}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
          <span>Type: <code className="rounded bg-slate-100 px-1 font-mono text-xs">{campaign.campaignType}</code></span>
          <span>Owner: {campaign.owner}</span>
          <span>Created {fmtDate(campaign.createdAt)}</span>
          <span>Updated {fmtDate(campaign.updatedAt)}</span>
        </div>
        <div className="mt-3 max-w-md">
          <ProgressBar completion={completion(campaign)} />
        </div>
      </div>

      <ApprovalBanner
        count={role === "stakeholder" ? pendingApprovalItems(campaign).length : pendingInScope}
        campaignId={campaign.campaignId}
      />

      <div className="flex gap-1 border-b border-slate-200">
        {(["items", "matrix"] as const).map((t) =>
          t === "matrix" && !hasMatrix ? null : (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
                tab === t
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t === "items" ? `Repos (${items.length})` : "Issue × repo matrix"}
            </button>
          )
        )}
      </div>

      {tab === "items" ? (
        items.length === 0 ? (
          <p className="px-1 py-6 text-center text-slate-400">
            No items in this campaign affect {team}'s repos.
          </p>
        ) : unitsLayout ? (
          <UnitCountsTable campaign={campaign} items={items} />
        ) : (
          <PlainItemsTable campaign={campaign} items={items} />
        )
      ) : (
        <MatrixView items={items} registry={reposQ.data} />
      )}
    </div>
  );
}
