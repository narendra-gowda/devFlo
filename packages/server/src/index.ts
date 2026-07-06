import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { campaignRoutes } from "./routes/campaigns.js";
import { repoRoutes } from "./routes/repos.js";
import { alertRoutes } from "./routes/alerts.js";

// Load packages/server/.env if present (GITHUB_TOKEN, PORT, ...).
// Uses Node's built-in loader (>= 20.12) — no dotenv dependency needed.
// Values already set in the shell take precedence and are not overwritten.
try {
  process.loadEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"));
  console.log("loaded .env");
} catch {
  /* no .env file — fine, mock mode for alerts */
}

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
