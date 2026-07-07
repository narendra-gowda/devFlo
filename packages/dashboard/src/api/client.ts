import type { AlertsResponse, CampaignManifest, RepoRegistry } from "@devflo/schema";

/**
 * The ONLY place the frontend talks to the network. Everything goes through
 * the thin server (vite proxies /api in dev) — no tokens in the browser.
 */

export interface ManifestError {
  file: string;
  errors: string[];
}

export interface CreateCampaignInput {
  campaignType: string;
  /** Broad class, e.g. "security" | "maintenance" — drives role scoping. */
  category?: string;
  title: string;
  owner: string;
  repos: { repo: string; org: string }[];
  config?: Record<string, unknown>;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.message ?? body.error ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  campaigns: () =>
    request<{ campaigns: CampaignManifest[]; errors: ManifestError[] }>("/api/campaigns"),
  campaign: (id: string) => request<CampaignManifest>(`/api/campaigns/${encodeURIComponent(id)}`),
  repos: () => request<RepoRegistry>("/api/repos"),
  /** force=true bypasses the server-side cache (manual refresh button) */
  alerts: (force = false) => request<AlertsResponse>(`/api/alerts${force ? "?force=1" : ""}`),
  createCampaign: (input: CreateCampaignInput) =>
    request<CampaignManifest>("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
};
