import type { FastifyInstance } from "fastify";
import { registerBuyRequestCreateRoute } from "./create";
import { registerBuyRequestDeleteRoute } from "./delete";
import { registerBuyRequestEditRoute } from "./edit";
import { registerBuyRequestGetByIdRoute } from "./get-by-id";
import { registerBuyRequestListRoute } from "./list";

export async function registerBuyRequestRoutes(fastify: FastifyInstance) {
  // Register all CRUD routes
  await registerBuyRequestListRoute(fastify);
  await registerBuyRequestGetByIdRoute(fastify);
  await registerBuyRequestCreateRoute(fastify);
  await registerBuyRequestEditRoute(fastify);
  await registerBuyRequestDeleteRoute(fastify);
}
