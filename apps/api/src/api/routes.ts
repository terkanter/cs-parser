import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth/index";
import { registerBuyRequestRoutes } from "./buy-requests/index";
import { registerUserRoutes } from "./users/index";

export async function registerResourceRoutes(fastify: FastifyInstance, _opts) {
  fastify.register(routes, { prefix: "/api" });
}

async function routes(fastify: FastifyInstance) {
  // Register authentication routes
  await registerAuthRoutes(fastify);

  // Register user routes
  fastify.register(
    registerUserRoutes,
    { prefix: "/users" },
  );

  // Register buy request routes
  fastify.register(
    registerBuyRequestRoutes,
    { prefix: "/buy-requests" },
  );

  // Register your other API routes here
}
