import Fastify from "fastify";
import { campaignRoutes } from "./routes/campaigns.js";
import { repoRoutes } from "./routes/repos.js";
import { alertRoutes } from "./routes/alerts.js";

const app = Fastify({ logger: true });

await app.register(campaignRoutes);
await app.register(repoRoutes);
await app.register(alertRoutes); // GitHub security-alerts proxy (live with GITHUB_TOKEN, mock otherwise)

/**
 * ── Phase 2+ proxy routes go here ──────────────────────────────────────────
 * The server exists so GitHub/ADO tokens never reach the browser. When live
 * integration lands, add e.g.:
 *
 *   GET /api/proxy/github/pr-status?prUrl=...   → GitHub REST (Octokit),
 *       token from env GITHUB_TOKEN, used to enrich item PR state live
 *   GET /api/proxy/ado/workitem/:id             → ADO Work Items API,
 *       PAT from env ADO_PAT
 *
 * Keep responses mapped to generic shapes (state, checks, reviewers) so the
 * frontend stays ecosystem- and provider-agnostic.
 * ───────────────────────────────────────────────────────────────────────────
 */

app.get("/api/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4400);
await app.listen({ port, host: "127.0.0.1" });
