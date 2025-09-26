import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth/index";
import { registerUserMeRoute } from "./users/me.route";
import { registerBuyRequestRoutes } from "./buy-requests/index";

export async function registerResourceRoutes(fastify: FastifyInstance, _opts) {
  fastify.register(routes, { prefix: "/api" });
}

async function routes(fastify: FastifyInstance) {
  // Register authentication routes
  await registerAuthRoutes(fastify);

  // Register user routes
  fastify.register(
    async function userRoutes(fastify) {
      await registerUserMeRoute(fastify);
    },
    { prefix: "/users" }
  );

  // Register buy request routes
  fastify.register(
    async function buyRequestRoutes(fastify) {
      await registerBuyRequestRoutes(fastify);
    },
    { prefix: "/buy-requests" }
  );

  // Register your other API routes here
}
