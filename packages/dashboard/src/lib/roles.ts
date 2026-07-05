import type { CampaignItem, CampaignManifest, RepoRegistry } from "@devflo/schema";
import type { Role } from "../context/role";

/**
 * The three roles are filtered views over the same data, never separate
 * models. Dev and EM scope to a team via the repo registry; Stakeholder
 * sees everything.
 */

export function teamRepoKeys(registry: RepoRegistry, team: string): Set<string> {
  return new Set(
    registry.repos.filter((r) => r.team === team).map((r) => `${r.org}/${r.repo}`)
  );
}

function itemInScope(item: CampaignItem, role: Role, teamRepos: Set<string>): boolean {
  if (role === "stakeholder") return true;
  return teamRepos.has(`${item.org}/${item.repo}`);
}

/** Items of a campaign visible to the current role. */
export function visibleItems(
  campaign: CampaignManifest,
  role: Role,
  teamRepos: Set<string>
): CampaignItem[] {
  return campaign.items.filter((i) => itemInScope(i, role, teamRepos));
}

/** Campaigns with at least one in-scope item. */
export function visibleCampaigns(
  campaigns: CampaignManifest[],
  role: Role,
  teamRepos: Set<string>
): CampaignManifest[] {
  return campaigns.filter((c) => visibleItems(c, role, teamRepos).length > 0);
}
