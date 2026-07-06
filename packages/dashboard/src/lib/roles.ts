import type { CampaignItem, CampaignManifest, RepoRegistry } from "@devflo/schema";
import type { Role } from "../context/role";

/**
 * The roles are filtered views over the same data, never separate models:
 *  - dev:   items scoped to their team's repos (via the registry)
 *  - em:    everything — all teams, all campaigns
 *  - cyber: everything, but only campaigns declared category === "security"
 */

export const SECURITY_CATEGORY = "security";

export function teamRepoKeys(registry: RepoRegistry, team: string): Set<string> {
  return new Set(
    registry.repos.filter((r) => r.team === team).map((r) => `${r.org}/${r.repo}`)
  );
}

/** Items of a campaign visible to the current role. */
export function visibleItems(
  campaign: CampaignManifest,
  role: Role,
  teamRepos: Set<string>
): CampaignItem[] {
  if (role === "dev") {
    return campaign.items.filter((i) => teamRepos.has(`${i.org}/${i.repo}`));
  }
  return campaign.items;
}

export function campaignVisible(
  campaign: CampaignManifest,
  role: Role,
  teamRepos: Set<string>
): boolean {
  if (role === "cyber") return campaign.category === SECURITY_CATEGORY;
  if (role === "dev") return visibleItems(campaign, role, teamRepos).length > 0;
  return true; // em: org-wide
}

export function visibleCampaigns(
  campaigns: CampaignManifest[],
  role: Role,
  teamRepos: Set<string>
): CampaignManifest[] {
  return campaigns.filter((c) => campaignVisible(c, role, teamRepos));
}
