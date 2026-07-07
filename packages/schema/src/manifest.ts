/**
 * Campaign Manifest v1.1 — THE contract between the campaign engine,
 * adapters, CLI, and dashboard. Ecosystem-specific data lives ONLY in
 * `metadata` fields; every other field must make sense for any campaign
 * type (npm, Maven, Gradle, Android SDK, React Native, ...).
 *
 * v1.1 changes:
 *  - removed riskLevel (campaign + item) — risk isn't meaningful for e.g. a
 *    Node upgrade; severity now lives per fix-unit via `category`
 *  - added FixUnit: one item = one repo = one PR; the per-package/per-finding
 *    breakdown inside that PR is `item.units`
 *  - added manifest.unitCategories: adapter-declared column buckets (e.g.
 *    CRITICAL/HIGH/MODERATE/LOW/CODE_SCANNING) so the UI renders counts
 *    without knowing what they mean
 */

export const SCHEMA_VERSION = "1.1" as const;

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "AWAITING_APPROVAL",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "PAUSED",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const ITEM_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "SKIPPED",
  "IN_PROGRESS",
  "TESTS_FAILED",
  "PR_RAISED",
  "MERGED",
  "NEEDS_ATTENTION",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const STRATEGIES = ["AUTO_FIX", "MANUAL_REVIEW"] as const;
export type Strategy = (typeof STRATEGIES)[number];

/**
 * One fix inside an item's single PR — a package bump, a code-scanning
 * finding, a config change. Generic on purpose: the UI renders units as
 * data (count by category, table of metadata), never by interpreting them.
 */
export interface FixUnit {
  /** Stable id within the item, e.g. package name ("lodash") or rule id. */
  key: string;
  /** Human label, e.g. "lodash (CVE-2026-31021)". Falls back to key. */
  label?: string;
  /**
   * Adapter-defined bucket used for count columns and rollups. For security
   * campaigns: CRITICAL | HIGH | MODERATE | LOW | CODE_SCANNING. Other
   * adapters may use different buckets — the UI treats these as opaque.
   */
  category?: string;
  /** Ecosystem-specific detail ONLY here: fromVersion, toVersion, advisory, ... */
  metadata: Record<string, unknown>;
}

export interface CampaignItem {
  itemId: string;
  repo: string;
  org: string;
  /** Human-readable summary, e.g. "Security fix PR: 3 packages (undici, semver, tmp)" */
  description: string;
  /**
   * Generic grouping key for matrix views on campaigns WITHOUT units,
   * e.g. "node-18-eol". When `units` are present the matrix pivots on
   * unit keys instead.
   */
  issueKey?: string;
  /** Human label for the issueKey row. */
  issueLabel?: string;
  strategy: Strategy;
  /** Status of this repo's single PR for the campaign. */
  status: ItemStatus;
  /** ISO 8601 — when status last changed. Powers aging views. */
  statusUpdatedAt: string;
  prUrl?: string;
  adoTicketUrl?: string;
  /** The fixes bundled into this repo's one PR. Optional — simple campaigns omit it. */
  units?: FixUnit[];
  /** Item-level ecosystem detail (build failures, blockers, ...). Opaque to the UI. */
  metadata: Record<string, unknown>;
}

export interface CampaignManifest {
  schemaVersion: typeof SCHEMA_VERSION;
  campaignId: string;
  /** Adapter identifier, e.g. "npm-dependabot", "node-version-upgrade". Opaque to the UI. */
  campaignType: string;
  /**
   * Broad campaign class declared by the adapter, e.g. "security" (dependabot,
   * code-scanning, secret-scanning fixes) or "maintenance". Role scoping uses
   * this — the Cyber Security role sees category === "security" — so the UI
   * never has to recognise individual campaignTypes.
   */
  category?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: CampaignStatus;
  /** Team or individual */
  owner: string;
  /**
   * Ordered column buckets for unit counts, declared by the adapter
   * (e.g. ["CRITICAL","HIGH","MODERATE","LOW","CODE_SCANNING"]).
   * Omit for campaigns without units.
   */
  unitCategories?: string[];
  items: CampaignItem[];
}

/**
 * Repo registry entry (manifests/repos.json). Not part of the manifest.
 *
 * Deliberately flat, orthogonal labels — NOT a hierarchy, because the
 * relationships aren't uniform (one org may hold several projects; another
 * org IS a single project):
 *  - org:     GitHub hosting/token mechanics
 *  - project: delivery/product grouping for viewing & reporting
 *  - team:    ownership, approval routing, role filtering
 *  - stack:   what the repo is — the primary campaign targeting selector
 */
export interface RepoRef {
  repo: string;
  org: string;
  team: string;
  /** Product/delivery grouping, e.g. "NewsFlash". Defaults to the org name when omitted. */
  project?: string;
  /** Tech stack / repo kind, e.g. "react-web", "function-app", "react-native", "terraform-template". */
  stack?: string;
}

export interface RepoRegistry {
  repos: RepoRef[];
}
