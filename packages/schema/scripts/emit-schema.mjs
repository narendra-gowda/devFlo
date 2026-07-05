// Writes campaign-manifest.schema.json from the built TS source of truth.
// Run after `npm run build -w @devflo/schema`.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { campaignManifestJsonSchema } = await import("../dist/index.js");
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../campaign-manifest.schema.json");
writeFileSync(out, JSON.stringify(campaignManifestJsonSchema, null, 2) + "\n");
console.log(`wrote ${out}`);
