/**
 * Live security-alert shapes (GitHub Dependabot + code scanning), served by
 * the dashboard server's /api/alerts proxy. Separate from the campaign
 * manifest: alerts are the raw DETECT-phase input; campaigns are the planned
 * remediation output.
 */

export const ALERT_SEVERITIES = ["critical", "high", "moderate", "low"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export interface DependabotAlert {
  package: string;
  severity: AlertSeverity;
  /** Vulnerable version range, e.g. "< 6.21.4" */
  affectedRange: string;
  /** First patched version, if one exists yet */
  fixVersion?: string;
  cveId?: string;
  /** Link to the CVE/advisory (or the alert itself) */
  url?: string;
  manifestPath?: string;
}

export interface CodeScanningAlert {
  rule: string;
  severity?: string;
  url?: string;
}

export interface RepoAlerts {
  org: string;
  repo: string;
  dependabot: DependabotAlert[];
  codeScanning: CodeScanningAlert[];
  /** GitHub Security page for the repo */
  securityUrl: string;
}

export interface AlertsResponse {
  /** "live" when proxied from GitHub, "mock" when served from the fixture */
  source: "live" | "mock";
  fetchedAt: string;
  repos: RepoAlerts[];
}
