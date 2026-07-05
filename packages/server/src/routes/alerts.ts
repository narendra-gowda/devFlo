import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import type {
  AlertSeverity,
  AlertsResponse,
  CodeScanningAlert,
  DependabotAlert,
  RepoAlerts,
} from "@devflo/schema";
import { readRepoRegistry } from "../lib/manifest-store.js";

/**
 * GitHub security-alerts proxy — the reason the server exists: the token
 * never reaches the browser.
 *
 *   GITHUB_TOKEN set   → live GitHub REST calls per registry repo
 *   GITHUB_TOKEN unset → mock fixture (Phase 1 demo mode)
 *
 * Responses are cached in memory for CACHE_TTL_MS so the dashboard's
 * auto-refresh polling never hammers the GitHub API (12 repos × 2 endpoints
 * per refresh; a 60s TTL keeps us far below the 5k req/h PAT rate limit).
 */

const CACHE_TTL_MS = 60_000;
const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/alerts.mock.json"
);

let cache: { at: number; data: AlertsResponse } | null = null;

/** GitHub uses "medium" where its UI says "moderate". */
function toSeverity(raw: string | undefined): AlertSeverity {
  if (raw === "critical" || raw === "high" || raw === "low") return raw;
  if (raw === "medium" || raw === "moderate") return "moderate";
  return "low";
}

interface GhDependabotAlert {
  html_url?: string;
  dependency?: { package?: { name?: string }; manifest_path?: string };
  security_vulnerability?: {
    severity?: string;
    vulnerable_version_range?: string;
    first_patched_version?: { identifier?: string } | null;
  };
  security_advisory?: { cve_id?: string | null; html_url?: string };
}

interface GhCodeScanningAlert {
  html_url?: string;
  rule?: { id?: string; security_severity_level?: string; severity?: string };
}

async function gh<T>(url: string, token: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  // 403/404 → Dependabot/code scanning not enabled or no access: treat as empty
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function fetchLiveRepo(org: string, repo: string, token: string): Promise<RepoAlerts> {
  const base = `https://api.github.com/repos/${org}/${repo}`;
  const [dep, cs] = await Promise.all([
    gh<GhDependabotAlert[]>(`${base}/dependabot/alerts?state=open&per_page=100`, token),
    gh<GhCodeScanningAlert[]>(`${base}/code-scanning/alerts?state=open&per_page=100`, token),
  ]);

  const dependabot: DependabotAlert[] = (dep ?? []).map((a) => ({
    package: a.dependency?.package?.name ?? "unknown",
    severity: toSeverity(a.security_vulnerability?.severity),
    affectedRange: a.security_vulnerability?.vulnerable_version_range ?? "unknown",
    fixVersion: a.security_vulnerability?.first_patched_version?.identifier ?? undefined,
    cveId: a.security_advisory?.cve_id ?? undefined,
    url: a.security_advisory?.html_url ?? a.html_url,
    manifestPath: a.dependency?.manifest_path,
  }));

  const codeScanning: CodeScanningAlert[] = (cs ?? []).map((a) => ({
    rule: a.rule?.id ?? "unknown",
    severity: a.rule?.security_severity_level ?? a.rule?.severity,
    url: a.html_url,
  }));

  return {
    org,
    repo,
    dependabot,
    codeScanning,
    securityUrl: `https://github.com/${org}/${repo}/security/dependabot`,
  };
}

async function loadAlerts(): Promise<AlertsResponse> {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    const registry = await readRepoRegistry();
    const repos = await Promise.all(
      registry.repos.map((r) => fetchLiveRepo(r.org, r.repo, token))
    );
    return { source: "live", fetchedAt: new Date().toISOString(), repos };
  }
  const fixture = JSON.parse(await readFile(FIXTURE, "utf8")) as { repos: RepoAlerts[] };
  return { source: "mock", fetchedAt: new Date().toISOString(), repos: fixture.repos };
}

export async function alertRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { force?: string } }>("/api/alerts", async (req) => {
    const force = req.query.force === "1";
    if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
    const data = await loadAlerts();
    cache = { at: Date.now(), data };
    return data;
  });
}
