import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { api } from "../api/client";
import { useCampaigns, useRepos } from "../api/hooks";
import { useRole } from "../context/role";

/**
 * Phase 1 create SHELL. It captures the shape Phase 4 self-service creation
 * needs (type, targets, config) and proves the write path end-to-end by
 * writing a valid DRAFT manifest. detect()/plan()/approval stay in the CLI.
 */
export function CreateCampaign() {
  const navigate = useNavigate();
  const { can, team } = useRole();
  const reposQ = useRepos();
  const campaignsQ = useCampaigns();

  const [campaignType, setCampaignType] = useState("");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState(team);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [configText, setConfigText] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // Known types are just the distinct values already present in manifests —
  // the UI has no hardcoded list of ecosystems.
  const knownTypes = useMemo(
    () => [...new Set((campaignsQ.data?.campaigns ?? []).map((c) => c.campaignType))].sort(),
    [campaignsQ.data]
  );

  const reposByOrg = useMemo(() => {
    const grouped = new Map<string, { repo: string; org: string; team: string }[]>();
    for (const r of reposQ.data?.repos ?? []) {
      grouped.set(r.org, [...(grouped.get(r.org) ?? []), r]);
    }
    return grouped;
  }, [reposQ.data]);

  if (!can.create) {
    return (
      <p className="text-slate-600">
        The stakeholder view is read-only. Switch role to create campaigns.{" "}
        <Link to="/" className="text-blue-600 hover:underline">← Back</Link>
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);

    let config: Record<string, unknown> | undefined;
    if (configText.trim()) {
      try {
        config = JSON.parse(configText);
      } catch {
        setError("Adapter config must be valid JSON (or empty).");
        return;
      }
    }

    setSubmitting(true);
    try {
      const repos = [...selected].map((key) => {
        const [org, repo] = key.split("/");
        return { org, repo };
      });
      const created = await api.createCampaign({ campaignType, title, owner, repos, config });
      navigate(`/campaigns/${created.campaignId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← All campaigns</Link>
      <h1 className="text-lg font-semibold text-slate-900">Create campaign</h1>

      <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <Info className="h-5 w-5 shrink-0 text-blue-500" />
        <p>
          Phase 1 writes a <strong>DRAFT</strong> manifest to <code className="font-mono text-xs">manifests/campaigns/</code>.
          The adapter's <code className="font-mono text-xs">detect()</code>/<code className="font-mono text-xs">plan()</code> (run
          via the CLI) fills in the real items; approval and execution stay gated. Full self-service
          creation with a campaign registry arrives in Phase 4.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Campaign type</span>
          <input
            required
            list="campaign-types"
            value={campaignType}
            onChange={(e) => setCampaignType(e.target.value)}
            placeholder="e.g. npm-dependabot"
            className={`mt-1 ${inputCls} font-mono`}
          />
          <datalist id="campaign-types">
            {knownTypes.map((t) => <option key={t} value={t} />)}
          </datalist>
          <span className="mt-0.5 block text-xs text-slate-400">Adapter identifier — free text; the UI has no hardcoded type list.</span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Title</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Node.js 22 LTS upgrade — Q3" className={`mt-1 ${inputCls}`} />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Owner (team or individual)</span>
          <input required value={owner} onChange={(e) => setOwner(e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>

        <fieldset className="text-sm">
          <legend className="font-medium text-slate-700">Target repos ({selected.size} selected)</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            {[...reposByOrg.entries()].map(([org, repos]) => (
              <div key={org}>
                <p className="mb-1 font-mono text-xs text-slate-500">{org}</p>
                {repos.map((r) => {
                  const key = `${r.org}/${r.repo}`;
                  return (
                    <label key={key} className="flex items-center gap-2 py-0.5">
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          e.target.checked ? next.add(key) : next.delete(key);
                          setSelected(next);
                        }}
                      />
                      <span>{r.repo}</span>
                      <span className="text-xs text-slate-400">{r.team}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Adapter config (JSON, optional)</span>
          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            rows={4}
            placeholder='{ "targetVersion": "22.11.0" }'
            className={`mt-1 ${inputCls} font-mono text-xs`}
          />
          <span className="mt-0.5 block text-xs text-slate-400">
            Passed to the adapter untouched. Schema v1.0 parks this in item metadata — a top-level config field is a v1.1 candidate.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || selected.size === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Writing manifest…" : "Create DRAFT manifest"}
        </button>
      </form>
    </div>
  );
}
