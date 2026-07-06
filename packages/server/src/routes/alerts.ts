import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import {
  ALERT_SEVERITIES,
  type AlertSeverity,
  type AlertsResponse,
  type CodeScanningAlert,
  type DependabotAlert,
  type RepoAlerts,
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

/**
 * ── Per-org tokens ──────────────────────────────────────────────────────────
 * Each GitHub org can need its own PAT. Tokens are resolved by NAMING
 * CONVENTION, not a hardcoded mapping: for org "X" the server looks up
 * env var GITHUB_TOKEN_<X normalised> and falls back to GITHUB_TOKEN.
 *
 * Normalisation: uppercase, any run of non-alphanumerics becomes "_".
 *   ETS  → GITHUB_TOKEN_ETS
 *   S&G  → GITHUB_TOKEN_S_G
 *   my-org → GITHUB_TOKEN_MY_ORG
 *
 * Onboarding a new org = one line in .env. Orgs without any token resolve
 * as empty (warned once at startup) instead of failing the whole view.
 * ────────────────────────────────────────────────────────────────────────────
 */
export function envKeyForOrg(org: string): string {
  return `GITHUB_TOKEN_${org.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

function tokenForOrg(org: string): string | undefined {
  return process.env[envKeyForOrg(org)] ?? process.env.GITHUB_TOKEN;
}

const warnedOrgs = new Set<string>();

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
  try {
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
  } catch {
    // Network failure for one repo must not 500 the whole consolidated view.
    return null;
  }
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

/**
 * Canonical package order within each repo: critical > high > moderate > low,
 * then package name. Sorted once per cache fill so every consumer gets the
 * same fixed order.
 */
function sortAlerts(repos: RepoAlerts[]): RepoAlerts[] {
  for (const repo of repos) {
    repo.dependabot.sort(
      (a, b) =>
        ALERT_SEVERITIES.indexOf(a.severity) - ALERT_SEVERITIES.indexOf(b.severity) ||
        a.package.localeCompare(b.package)
    );
  }
  return repos;
}

function emptyRepo(org: string, repo: string): RepoAlerts {
  return {
    org,
    repo,
    dependabot: [],
    codeScanning: [],
    securityUrl: `https://github.com/${org}/${repo}/security/dependabot`,
  };
}

async function loadAlerts(): Promise<AlertsResponse> {
  const registry = await readRepoRegistry();

  // Live mode when ANY token resolves for at least one registry org
  // (org-specific GITHUB_TOKEN_<ORG> or the GITHUB_TOKEN fallback).
  const live = registry.repos.some((r) => tokenForOrg(r.org));
  if (live) {
    const repos = await Promise.all(
      registry.repos.map((r) => {
        const token = tokenForOrg(r.org);
        if (!token) {
          if (!warnedOrgs.has(r.org)) {
            warnedOrgs.add(r.org);
            console.warn(
              `[alerts] no token for org "${r.org}" — set ${envKeyForOrg(r.org)} (or GITHUB_TOKEN as fallback); its repos will show as empty`
            );
          }
          return Promise.resolve(emptyRepo(r.org, r.repo));
        }
        return fetchLiveRepo(r.org, r.repo, token);
      })
    );
    return { source: "live", fetchedAt: new Date().toISOString(), repos: sortAlerts(repos) };
  }

  const fixture = JSON.parse(await readFile(FIXTURE, "utf8")) as { repos: RepoAlerts[] };
  return { source: "mock", fetchedAt: new Date().toISOString(), repos: sortAlerts(fixture.repos) };
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
