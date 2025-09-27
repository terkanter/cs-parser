import type { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

export const authGuard = fastifyPlugin(async (app: FastifyInstance) => {
  app.addHook("preHandler", async (request) => {
    request.ctx.requireAuth();
  });
});
