import type { FastifyInstance } from "fastify";
import { registerPlatformAccountListRoute } from "./list";
import { registerPlatformAccountUpsertRoute } from "./upsert";

export async function registerPlatformAccountRoutes(fastify: FastifyInstance) {
  // Register all platform account routes
  await registerPlatformAccountListRoute(fastify);
  await registerPlatformAccountUpsertRoute(fastify);
}
