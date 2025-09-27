import type { FastifyInstance } from "fastify";
import { registerUserMeRoutes } from "./me";

export async function registerUserRoutes(fastify: FastifyInstance) {
  await registerUserMeRoutes(fastify);
}
