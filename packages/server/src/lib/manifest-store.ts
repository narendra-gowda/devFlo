/**
 * Phase 1 "database": campaign manifest JSON files on disk.
 * This module is the single swap point when manifests move to a Git repo
 * clone, an API, or a real database — nothing else in the server touches fs.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv } from "ajv";
import {
  campaignManifestJsonSchema,
  type CampaignManifest,
  type RepoRegistry,
} from "@devflo/schema";

const MANIFESTS_DIR =
  process.env.DEVFLO_MANIFESTS_DIR ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../manifests");

const CAMPAIGNS_DIR = path.join(MANIFESTS_DIR, "campaigns");

const ajv = new Ajv({ allErrors: true, strict: false });
const validateManifest = ajv.compile<CampaignManifest>(campaignManifestJsonSchema);

export interface ManifestError {
  file: string;
  errors: string[];
}

export async function readCampaigns(): Promise<{
  campaigns: CampaignManifest[];
  errors: ManifestError[];
}> {
  const campaigns: CampaignManifest[] = [];
  const errors: ManifestError[] = [];
  let files: string[] = [];
  try {
    files = (await readdir(CAMPAIGNS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return { campaigns, errors: [{ file: CAMPAIGNS_DIR, errors: ["campaigns directory not found"] }] };
  }

  for (const file of files) {
    try {
      const raw = JSON.parse(await readFile(path.join(CAMPAIGNS_DIR, file), "utf8"));
      if (validateManifest(raw)) {
        campaigns.push(raw);
      } else {
        errors.push({
          file,
          errors: (validateManifest.errors ?? []).map((e) => `${e.instancePath} ${e.message}`),
        });
      }
    } catch (err) {
      errors.push({ file, errors: [`unreadable/invalid JSON: ${(err as Error).message}`] });
    }
  }

  campaigns.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { campaigns, errors };
}

export async function readCampaign(campaignId: string): Promise<CampaignManifest | undefined> {
  const { campaigns } = await readCampaigns();
  return campaigns.find((c) => c.campaignId === campaignId);
}

export async function readRepoRegistry(): Promise<RepoRegistry> {
  const raw = await readFile(path.join(MANIFESTS_DIR, "repos.json"), "utf8");
  return JSON.parse(raw) as RepoRegistry;
}

/** Validates and writes a new manifest. Refuses to overwrite an existing campaign. */
export async function writeCampaign(manifest: CampaignManifest): Promise<void> {
  if (!validateManifest(manifest)) {
    const msgs = (validateManifest.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
    throw Object.assign(new Error(`manifest failed schema validation: ${msgs.join("; ")}`), {
      statusCode: 400,
    });
  }
  const existing = await readCampaign(manifest.campaignId);
  if (existing) {
    throw Object.assign(new Error(`campaign ${manifest.campaignId} already exists`), {
      statusCode: 409,
    });
  }
  await mkdir(CAMPAIGNS_DIR, { recursive: true });
  await writeFile(
    path.join(CAMPAIGNS_DIR, `${manifest.campaignId}.json`),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  );
}
