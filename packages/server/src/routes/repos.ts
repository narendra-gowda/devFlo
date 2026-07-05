import type { FastifyInstance } from "fastify";
import { readRepoRegistry } from "../lib/manifest-store.js";

export async function repoRoutes(app: FastifyInstance) {
  app.get("/api/repos", async () => readRepoRegistry());
}
