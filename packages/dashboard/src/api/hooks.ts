import { useCallback, useEffect, useState } from "react";
import type { AlertsResponse, CampaignManifest, RepoRegistry } from "@devflo/schema";
import { api, type ManifestError } from "./client";

/**
 * Deliberately dumb data fetching: refetch on mount, no client cache layers.
 * The manifests on disk are the source of truth; the frontend must always be
 * reproducible from them (stateless/idempotent principle).
 */

interface Loadable<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ loading: true });
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    load()
      .then((data) => alive && setState({ data, loading: false }))
      .catch((e) => alive && setState({ error: (e as Error).message, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useCampaigns() {
  return useLoad<{ campaigns: CampaignManifest[]; errors: ManifestError[] }>(
    () => api.campaigns(),
    []
  );
}

export function useCampaign(id: string | undefined) {
  return useLoad<CampaignManifest>(
    () => (id ? api.campaign(id) : Promise.reject(new Error("no id"))),
    [id]
  );
}

export function useRepos() {
  return useLoad<RepoRegistry>(() => api.repos(), []);
}

/**
 * Auto-refresh interval for the live alerts page. 60s matches the server's
 * cache TTL — polling faster would just get cached responses, and it keeps
 * GitHub API usage far below rate limits when live. Tune both together.
 */
export const ALERTS_REFRESH_MS = 60_000;

export function useAlerts(intervalMs: number = ALERTS_REFRESH_MS) {
  const [data, setData] = useState<AlertsResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    try {
      setData(await api.alerts(force));
      setError(undefined);
    } catch (e) {
      setError((e as Error).message); // keep last good data on poll failure
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(), intervalMs);
    return () => clearInterval(timer);
  }, [load, intervalMs]);

  return { data, error, loading, refreshing, refresh: () => load(true) };
}
