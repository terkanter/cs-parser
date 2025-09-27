import type { FastifyInstance } from "fastify";
import { registerUserGetMeRoute } from "./get";

export async function registerUserMeRoutes(fastify: FastifyInstance) {
  // Register all /users/me routes
  await registerUserGetMeRoute(fastify);
}
