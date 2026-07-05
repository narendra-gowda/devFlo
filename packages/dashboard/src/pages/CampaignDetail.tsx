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
import { panel, thBase, thCenter } from "../components/ui";
import { severityTone } from "../lib/severity";
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
      className={`whitespace-nowrap text-xs tabular-nums ${stale ? "font-semibold text-danger" : "text-dim"}`}
      title={`In this status since ${fmtDate(item.statusUpdatedAt)}`}
    >
      {days}d{stale ? " ⚠" : ""}
    </span>
  );
}

function LinkCell({ item }: { item: CampaignItem }) {
  return (
    <div className="flex justify-center gap-3 text-xs">
      {item.prUrl ? (
        <a href={item.prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-accent2 hover:underline">
          PR <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-edge2">PR</span>
      )}
      {item.adoTicketUrl ? (
        <a href={item.adoTicketUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-accent2 hover:underline">
          ADO <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-edge2">ADO</span>
      )}
    </div>
  );
}

function ExpandedDetail({ campaign, item, colSpan }: { campaign: CampaignManifest; item: CampaignItem; colSpan: number }) {
  const attention = ATTENTION_STATUSES.includes(item.status);
  return (
    <tr className={attention ? "border-l-4 border-l-danger" : ""}>
      {/* Single full-width cell so the inset colour runs edge to edge. */}
      <td
        colSpan={colSpan}
        className="space-y-3 bg-panel3 px-4 py-3 shadow-[inset_0_4px_8px_-4px_rgba(0,0,0,.6),inset_0_-4px_8px_-4px_rgba(0,0,0,.5)]"
      >
        <p className="text-sm text-ink/90">{item.description}</p>
        {item.units && item.units.length > 0 && <UnitsTable units={item.units} />}
        {Object.keys(item.metadata).length > 0 && (
          <div>
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[.07em] text-dim">
              Adapter metadata ({campaign.campaignType})
            </p>
            <MetadataTable metadata={item.metadata} />
          </div>
        )}
      </td>
    </tr>
  );
}

const rowCls = (attention: boolean) =>
  `cursor-pointer hover:bg-hover ${attention ? "border-l-4 border-l-danger bg-danger/[.06]" : ""}`;

/**
 * Table layout for campaigns whose items carry fix units (e.g. security
 * campaigns): one row per repo (= one PR), with per-category counts.
 * Columns come from the manifest's unitCategories — nothing hardcoded.
 */
function UnitCountsTable({ campaign, items }: { campaign: CampaignManifest; items: CampaignItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const categories = campaignUnitCategories(campaign);
  // chevron + repo + categories + total + status + age + links
  const colSpan = categories.length + 6;

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  return (
    <div className={`overflow-x-auto ${panel}`}>
      <table className="w-full text-sm">
        <thead className="border-b border-edge">
          <tr>
            <th className="w-8 px-2 py-2" />
            <th className={thBase.replace("px-4", "px-2")}>Repo</th>
            {categories.map((c) => (
              <th key={c} className={thCenter}>{c.replaceAll("_", " ")}</th>
            ))}
            <th className={thCenter}>Total</th>
            <th className={thCenter}>Status</th>
            <th className={thCenter} title="Days in current status">Age</th>
            <th className={thCenter}>Links</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge/60">
          {items.map((item) => {
            const { byCategory, total } = unitCounts(item);
            const attention = ATTENTION_STATUSES.includes(item.status);
            const open = expanded.has(item.itemId);
            return (
              <Rows
                key={item.itemId}
                row={
                  <tr className={rowCls(attention)} onClick={() => toggle(item.itemId)}>
                    <td className="px-2 py-2.5 text-dim">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="font-semibold text-ink">
                        {attention && <AlertTriangle className="mr-1 inline h-4 w-4 text-danger" />}
                        {item.repo}
                      </span>
                      <span className="block text-xs text-dim">{item.org}</span>
                    </td>
                    {categories.map((c) => {
                      const n = byCategory[c] ?? 0;
                      return (
                        <td key={c} className="px-3 py-2.5 text-center tabular-nums">
                          {n > 0 ? <span className={severityTone(c).count}>{n}</span> : <span className="text-edge2">·</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-ink">{total}</td>
                    <td className="px-3 py-2.5 text-center"><ItemStatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-center"><AgeChip item={item} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
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
function Rows({ row, detail }: { row: React.ReactNode; detail: React.ReactNode }) {
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
    <div className={`overflow-x-auto ${panel}`}>
      <table className="w-full text-sm">
        <thead className="border-b border-edge">
          <tr>
            <th className="w-8 px-2 py-2" />
            <th className={thBase.replace("px-4", "px-2")}>Repo</th>
            <th className={thBase}>Change</th>
            <th className={thCenter}>Strategy</th>
            <th className={thCenter}>Status</th>
            <th className={thCenter} title="Days in current status">Age</th>
            <th className={thCenter}>Links</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge/60">
          {items.map((item) => {
            const attention = ATTENTION_STATUSES.includes(item.status);
            const open = expanded.has(item.itemId);
            return (
              <Rows
                key={item.itemId}
                row={
                  <tr className={rowCls(attention)} onClick={() => toggle(item.itemId)}>
                    <td className="px-2 py-2.5 text-dim">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="font-semibold text-ink">{item.repo}</span>
                      <span className="block text-xs text-dim">{item.org}</span>
                    </td>
                    <td className="px-3 py-2.5 text-ink/85">
                      {attention && <AlertTriangle className="mr-1 inline h-4 w-4 text-danger" />}
                      {item.description}
                    </td>
                    <td className="px-3 py-2.5 text-center"><StrategyBadge strategy={item.strategy} /></td>
                    <td className="px-3 py-2.5 text-center"><ItemStatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-center"><AgeChip item={item} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <LinkCell item={item} />
                    </td>
                  </tr>
                }
                detail={open ? <ExpandedDetail campaign={campaign} item={item} colSpan={7} /> : null}
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

  if (campaignQ.loading || reposQ.loading) return <p className="text-muted">Loading…</p>;
  if (campaignQ.error || !campaign || !reposQ.data)
    return (
      <div>
        <p className="text-danger">Campaign not found: {campaignQ.error}</p>
        <Link to="/" className="text-sm text-accent2 hover:underline">← Back to campaigns</Link>
      </div>
    );

  const pendingInScope = items.filter((i) => i.status === "PENDING_APPROVAL").length;
  const unitsLayout = hasUnits(campaign);
  const hasMatrix = campaign.items.some((i) => i.issueKey || i.units?.length);

  return (
    <div className="space-y-4">
      {/* inline-block so space-y's margin-bottom actually applies (inline elements ignore vertical margins) */}
      <Link to="/" className="inline-block text-sm text-muted hover:text-ink">← All campaigns</Link>

      <div className={`${panel} px-5 py-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[17px] font-semibold tracking-tight text-ink">{campaign.title}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted">
          <span>
            Type:{" "}
            <code className="rounded-[5px] border border-accent2/20 bg-accent2/[.09] px-1.5 py-px font-mono text-[10.5px] text-accent2">
              {campaign.campaignType}
            </code>
          </span>
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

      <div className="flex gap-1 border-b border-edge">
        {(["items", "matrix"] as const).map((t) =>
          t === "matrix" && !hasMatrix ? null : (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm font-medium ${
                tab === t
                  ? "border-accent text-accent2"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t === "items" ? `Repos (${items.length})` : "Issue × repo matrix"}
            </button>
          )
        )}
      </div>

      {tab === "items" ? (
        items.length === 0 ? (
          <p className="px-1 py-6 text-center text-dim">
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
