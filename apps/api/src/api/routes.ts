import { authGuard } from "@/middleware/auth";
import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth/index";
import { registerBuyRequestRoutes } from "./buy-requests/index";
import { registerUserRoutes } from "./users/index";

export async function registerResourceRoutes(fastify: FastifyInstance, _opts) {
  fastify.register(routes, { prefix: "/api" });
}

async function routes(fastify: FastifyInstance) {
  await registerAuthRoutes(fastify);

  fastify.register(async function protectedRoutes(fastify) {
    fastify.register(authGuard);
    fastify.register(registerUserRoutes, { prefix: "/users" });
    fastify.register(registerBuyRequestRoutes, { prefix: "/buy-requests" });
  });
}
