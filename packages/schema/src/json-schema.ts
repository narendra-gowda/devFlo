import { CAMPAIGN_STATUSES, ITEM_STATUSES, STRATEGIES } from "./manifest.js";

/**
 * JSON Schema equivalent of the CampaignManifest interface (v1.1).
 * TS types are the source of truth; run `npm run emit-schema -w @devflo/schema`
 * to write campaign-manifest.schema.json for non-TS consumers.
 */
export const campaignManifestJsonSchema = {
  $id: "https://devflo.internal/schemas/campaign-manifest-1.1.json",
  title: "CampaignManifest",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "campaignId",
    "campaignType",
    "title",
    "createdAt",
    "updatedAt",
    "status",
    "owner",
    "items",
  ],
  properties: {
    schemaVersion: { const: "1.1" },
    campaignId: { type: "string", minLength: 1 },
    campaignType: { type: "string", minLength: 1 },
    category: { type: "string" },
    title: { type: "string", minLength: 1 },
    createdAt: { type: "string", minLength: 1 },
    updatedAt: { type: "string", minLength: 1 },
    status: { enum: [...CAMPAIGN_STATUSES] },
    owner: { type: "string", minLength: 1 },
    unitCategories: { type: "array", items: { type: "string", minLength: 1 } },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "itemId",
          "repo",
          "org",
          "description",
          "strategy",
          "status",
          "statusUpdatedAt",
          "metadata",
        ],
        properties: {
          itemId: { type: "string", minLength: 1 },
          repo: { type: "string", minLength: 1 },
          org: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          issueKey: { type: "string" },
          issueLabel: { type: "string" },
          strategy: { enum: [...STRATEGIES] },
          status: { enum: [...ITEM_STATUSES] },
          statusUpdatedAt: { type: "string", minLength: 1 },
          prUrl: { type: "string" },
          adoTicketUrl: { type: "string" },
          units: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["key", "metadata"],
              properties: {
                key: { type: "string", minLength: 1 },
                label: { type: "string" },
                category: { type: "string" },
                metadata: { type: "object" },
              },
            },
          },
          metadata: { type: "object" },
        },
      },
    },
  },
};
