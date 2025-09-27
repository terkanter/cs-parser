import type { FastifyInstance } from "fastify";
import { registerUserGetMeRoute } from "./get";
import { registerUserUpdateMeRoute } from "./update";

export async function registerUserMeRoutes(fastify: FastifyInstance) {
  // Register all /users/me routes
  await registerUserGetMeRoute(fastify);
  await registerUserUpdateMeRoute(fastify);
}
