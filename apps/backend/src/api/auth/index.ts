import { registerBetterAuthHandler } from "@/auth/fastify-handler";
import type { FastifyInstance } from "fastify";

export async function registerAuthRoutes(fastify: FastifyInstance) {
  // Register Better Auth handler
  await registerBetterAuthHandler(fastify);
}
