import type { CampaignItem, CampaignManifest, ItemStatus } from "./manifest.js";

/**
 * Pure, ecosystem-agnostic derivations over the manifest. The frontend is
 * stateless: everything it shows is computed from manifests via these helpers.
 */

/** Statuses that mean "a human needs to look at this". */
export const ATTENTION_STATUSES: ItemStatus[] = ["TESTS_FAILED", "NEEDS_ATTENTION"];

/** Terminal, "no further work" statuses. */
export const DONE_STATUSES: ItemStatus[] = ["MERGED", "SKIPPED"];

export interface Completion {
  merged: number;
  total: number;
  pct: number; // 0-100, rounded
}

/** Completion = merged / total. SKIPPED stays in the denominator (deliberate — see README). */
export function completion(campaign: CampaignManifest): Completion {
  const total = campaign.items.length;
  const merged = campaign.items.filter((i) => i.status === "MERGED").length;
  return { merged, total, pct: total === 0 ? 0 : Math.round((merged / total) * 100) };
}

export function countByStatus(campaign: CampaignManifest): Partial<Record<ItemStatus, number>> {
  const out: Partial<Record<ItemStatus, number>> = {};
  for (const item of campaign.items) out[item.status] = (out[item.status] ?? 0) + 1;
  return out;
}

export function pendingApprovalItems(campaign: CampaignManifest): CampaignItem[] {
  return campaign.items.filter((i) => i.status === "PENDING_APPROVAL");
}

export function attentionItems(campaign: CampaignManifest): CampaignItem[] {
  return campaign.items.filter((i) => ATTENTION_STATUSES.includes(i.status));
}

export function isItemOpen(item: CampaignItem): boolean {
  return !DONE_STATUSES.includes(item.status);
}

/** True if any item carries a fix-unit breakdown (drives the counts table layout). */
export function hasUnits(campaign: CampaignManifest): boolean {
  return campaign.items.some((i) => (i.units?.length ?? 0) > 0);
}

/**
 * Ordered count-column buckets: the adapter-declared `unitCategories` if
 * present, otherwise categories in order of first appearance across items.
 * The UI never hardcodes bucket names.
 */
export function campaignUnitCategories(campaign: CampaignManifest): string[] {
  if (campaign.unitCategories?.length) return campaign.unitCategories;
  const seen: string[] = [];
  for (const item of campaign.items) {
    for (const unit of item.units ?? []) {
      if (unit.category && !seen.includes(unit.category)) seen.push(unit.category);
    }
  }
  return seen;
}

/** Per-item unit counts keyed by category (uncategorised units count only toward total). */
export function unitCounts(item: CampaignItem): { byCategory: Record<string, number>; total: number } {
  const byCategory: Record<string, number> = {};
  const units = item.units ?? [];
  for (const unit of units) {
    if (unit.category) byCategory[unit.category] = (byCategory[unit.category] ?? 0) + 1;
  }
  return { byCategory, total: units.length };
}
