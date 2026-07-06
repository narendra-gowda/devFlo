import type { FastifyInstance } from "fastify";
import { SCHEMA_VERSION, type CampaignManifest } from "@devflo/schema";
import { readCampaign, readCampaigns, writeCampaign } from "../lib/manifest-store.js";

interface CreateCampaignBody {
  campaignType: string;
  category?: string;
  title: string;
  owner: string;
  repos: { repo: string; org: string }[];
  /** Free-form adapter config captured by the create shell; stored in item metadata for now. */
  config?: Record<string, unknown>;
}

export async function campaignRoutes(app: FastifyInstance) {
  app.get("/api/campaigns", async () => {
    // Manifests are small; return them whole. The frontend derives all
    // aggregates (completion %, pending approvals) so nothing can drift.
    return readCampaigns();
  });

  app.get<{ Params: { id: string } }>("/api/campaigns/:id", async (req, reply) => {
    const campaign = await readCampaign(req.params.id);
    if (!campaign) return reply.code(404).send({ error: "campaign not found" });
    return campaign;
  });

  /**
   * Phase 1 create shell: writes a valid DRAFT manifest. The CLI adapter's
   * detect()/plan() later replaces the placeholder items with real ones.
   * Full self-service creation (approval workflows, registry) is Phase 4.
   */
  app.post<{ Body: CreateCampaignBody }>(
    "/api/campaigns",
    {
      schema: {
        body: {
          type: "object",
          required: ["campaignType", "title", "owner", "repos"],
          additionalProperties: false,
          properties: {
            campaignType: { type: "string", minLength: 1 },
            category: { type: "string" },
            title: { type: "string", minLength: 1 },
            owner: { type: "string", minLength: 1 },
            repos: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["repo", "org"],
                properties: { repo: { type: "string" }, org: { type: "string" } },
              },
            },
            config: { type: "object" },
          },
        },
      },
    },
    async (req, reply) => {
      const { campaignType, category, title, owner, repos, config } = req.body;
      const now = new Date().toISOString();
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
      const campaignId = `camp-${slug}-${now.slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`;

      const manifest: CampaignManifest = {
        schemaVersion: SCHEMA_VERSION,
        campaignId,
        campaignType,
        ...(category ? { category } : {}),
        title,
        createdAt: now,
        updatedAt: now,
        status: "DRAFT",
        owner,
        items: repos.map((r, i) => ({
          itemId: `${campaignId}-item-${String(i + 1).padStart(3, "0")}`,
          repo: r.repo,
          org: r.org,
          description: `Draft — to be populated by ${campaignType} adapter detect()/plan()`,
          strategy: "MANUAL_REVIEW" as const,
          status: "PENDING_APPROVAL" as const,
          statusUpdatedAt: now,
          // NOTE: campaign-level config has no home in schema v1.0 (deliberate —
          // adding a top-level `config` field is a candidate for v1.1). Parked
          // in item metadata so nothing is lost.
          metadata: { source: "dashboard-create", config: config ?? {} },
        })),
      };

      await writeCampaign(manifest);
      return reply.code(201).send(manifest);
    }
  );
}
