import type { FastifyInstance } from "fastify";
import { registerBuyRequestCreateRoute } from "./create";
import { registerBuyRequestDeleteRoute } from "./delete";
import { registerBuyRequestEditRoute } from "./edit";
import { registerBuyRequestListRoute } from "./list";

export async function registerBuyRequestRoutes(fastify: FastifyInstance) {
  // Register all CRUD routes
  await registerBuyRequestListRoute(fastify);
  await registerBuyRequestCreateRoute(fastify);
  await registerBuyRequestEditRoute(fastify);
  await registerBuyRequestDeleteRoute(fastify);
}
