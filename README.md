# devFlo — Campaign Dashboard (Phase 1)

Local dashboard for the devFlo internal developer platform: view campaign status across repos/orgs, with the manifest JSON files as the source of truth.

## Run

```bash
npm install
npm run dashboard   # server on :4400 + web on :5173
```

Open http://localhost:5173.

## Layout

```
manifests/              source of truth ("database" for Phase 1)
  repos.json            repo → org/team registry (role filtering joins on this)
  campaigns/*.json      one CampaignManifest per file
packages/
  schema/               THE contract: TS types, JSON Schema, pure derive helpers
  server/               thin Fastify server — reads/validates manifests, POST create,
                        future GitHub/ADO proxy (see comments in src/index.ts)
  dashboard/            React + Vite + Tailwind
```

## Architectural rules encoded here

- **No ecosystem logic in the UI.** Ecosystem detail lives only in `metadata` fields, rendered generically (`MetadataTable`, `UnitsTable`). One item = one repo = one PR; the per-package/per-finding breakdown is `item.units` (generic `FixUnit`s). Severity count columns (CRITICAL/HIGH/…) come from the manifest's `unitCategories` — the UI renders whatever buckets the adapter declares. Matrix rows pivot on unit keys (or item `issueKey` for unit-less campaigns). Zero `if (campaignType === ...)` anywhere in components.
- **Manifests are the contract.** Server validates every file against `campaignManifestJsonSchema` (invalid files are surfaced in the UI, not silently dropped). `npm run emit-schema -w @devflo/schema` writes `campaign-manifest.schema.json` for the CLI to validate against.
- **Stateless frontend.** Everything on screen derives from manifests via pure helpers in `@devflo/schema` (`completion`, `pendingApprovalItems`, ...). Only UI preference stored client-side is the mock role selection.
- **Roles are filtered views**, not systems: Dev/EM scope items to a team via `repos.json`; Stakeholder sees all, read-only (`can.create/approve = false`). Swap point for real SSO: `context/role.tsx`.
- **Human gate is first-class**: `ApprovalBanner` renders wherever approvals are pending; approve/skip buttons are laid out but disabled until Phase 2 async approval.

## Live security alerts

`/alerts` shows consolidated Dependabot + code-scanning alerts per repo, grouped by organisation (toggle: by team), auto-refreshing every 60s. The server proxies GitHub so tokens never reach the browser:

```bash
GITHUB_TOKEN=ghp_xxx npm run dashboard   # live mode (token needs security_events read)
npm run dashboard                        # mock fixture: packages/server/fixtures/alerts.mock.json
```

Alternatively put the token in `packages/server/.env` (`GITHUB_TOKEN=ghp_xxx`) — loaded at server boot via Node's built-in `loadEnvFile` (requires Node >= 20.12). Shell env vars take precedence. Don't commit the file; it's gitignored.

Server responses are cached 60s (`CACHE_TTL_MS` in `routes/alerts.ts`) — tune together with `ALERTS_REFRESH_MS` in the dashboard. Repos where Dependabot/code scanning is disabled (GitHub returns 403/404) show as empty rather than erroring.

## Swapping mock data for real CLI output

Point `DEVFLO_MANIFESTS_DIR` at the directory your CLI writes to (defaults to `./manifests`). Files must conform to schema v1.1 (v1.1 removed `riskLevel` and added `units`/`unitCategories`).

## Deliberate decisions to revisit

- **Completion % = merged/total; SKIPPED stays in the denominator.** Change in `packages/schema/src/derive.ts::completion` if skipped should count as done.
- **Matrix "not affected" population** = registry repos in the orgs the campaign touches (`lib/matrix.ts`).
- **Campaign-level adapter config** has no top-level schema field yet; the create shell parks it in item `metadata.config`. Promoting it to a `config` field is a candidate for a future schema version.
- **Uncategorised units** count toward an item's TOTAL but no category column.
- **Item staleness warning** threshold: >7 days in a non-terminal status (`AgeChip` in `CampaignDetail.tsx`).
